// Implementação real (Prisma/PostgreSQL) de `AgendamentoRepository`.
//
// Esta é a ÚNICA camada que conhece tanto Prisma quanto os tipos de
// domínio/aplicação. Nenhuma regra de negócio (R1-R7) é implementada
// aqui — apenas tradução de dados e o mecanismo de transação/lock
// necessário para a atomicidade do agendamento (ver
// `executarComLockDoColaborador` abaixo e PLAN.md, seção "Atualização
// do plano — decisões de persistência e concorrência").
//
// ## Transação e lock (ver análise de concorrência registrada
// anteriormente)
//
// Duas requisições concorrentes de agendamento para o MESMO colaborador
// poderiam, sem nenhuma proteção, ler o mesmo estado de "agendamentos
// ativos" antes de qualquer uma delas gravar, ambas passarem a
// validação de R3/R5 (porque, no momento da leitura, nenhuma via o
// agendamento da outra), e ambas inserirem — violando R3 ou R5 mesmo
// com a lógica de validação matematicamente correta.
//
// A proteção escolhida (`SELECT ... FOR UPDATE` na linha do
// colaborador, dentro de uma transação) é a solução mínima suficiente:
// o PostgreSQL bloqueia a linha do colaborador até o fim da transação,
// de forma que uma segunda transação concorrente para o MESMO
// colaborador terá que ESPERAR o `FOR UPDATE` ser liberado antes de
// conseguir fazer a sua própria leitura — serializando, na prática, o
// acesso ao estado dos agendamentos daquele colaborador especificamente
// (não dos demais colaboradores, que continuam podendo agendar em
// paralelo sem bloqueio). Não foi usado `SERIALIZABLE` (mudaria o nível
// de isolamento de toda a transação, com maior custo e retry
// necessário) nem lock distribuído/Redis/fila (infraestrutura
// desnecessária para o escopo do teste).
//
// `Prisma.sql` é usado para montar a query parametrizada (evita SQL
// injection) — é a única ocorrência de SQL raw nesta implementação,
// estritamente necessária porque o Prisma Client não expõe um método de
// alto nível para `SELECT ... FOR UPDATE`.
//
// ## Ausência de estado mutável compartilhado (IMPORTANTE)
//
// O cliente Prisma usado por esta instância (`this.cliente`) é definido
// uma única vez, no CONSTRUTOR, e nunca é reatribuído depois —
// `readonly`. Isto é deliberado: uma versão anterior desta
// implementação usava um campo mutável (`this.clienteAtivo`) que era
// temporariamente sobrescrito dentro de `executarComLockDoColaborador`
// e restaurado ao final. Esse padrão é um bug real sob concorrência:
// se a MESMA instância de `AgendamentoRepositoryPrisma` for
// compartilhada entre requisições HTTP concorrentes (o padrão normal —
// uma única instância de repository por aplicação, não uma por
// requisição), duas chamadas simultâneas a `executarComLockDoColaborador`
// poderiam sobrescrever o campo mutável uma da outra, fazendo uma
// requisição operar com o cliente de transação de OUTRA requisição —
// exatamente o tipo de corrupção de estado que a transação deveria
// impedir.
//
// A correção: `executarComLockDoColaborador` nunca modifica `this`.
// Em vez disso, ela cria uma NOVA instância de
// `AgendamentoRepositoryPrisma`, construída com o cliente de transação
// (`tx`) — um objeto local, imutável, que existe apenas durante aquela
// chamada e não é compartilhado com nenhuma outra — e passa essa nova
// instância como argumento para o callback `operacao`. O callback (no
// application service) usa EXPLICITAMENTE o repository recebido como
// parâmetro para todas as operações que precisam estar dentro da
// transação, nunca a referência original fechada no closure. Como cada
// chamada concorrente cria sua própria instância local vinculada ao seu
// próprio `tx`, não há nenhum campo compartilhado entre elas — duas
// chamadas concorrentes nunca podem ler ou sobrescrever o cliente uma da
// outra, porque cada uma tem o seu próprio objeto, não um campo mutável
// de uma instância compartilhada.

import type { PrismaClient } from "@prisma/client"
import { Prisma } from "@prisma/client"
import type {
  Agendamento,
  AgendamentoRepository,
  NovoAgendamento,
} from "../../application/repositories.js"
import type { StatusAgendamento } from "../../application/status-agendamento.js"
import { calendarDateParaDate, dateParaCalendarDate } from "./conversoes.js"

type ClientePrisma = PrismaClient | Prisma.TransactionClient

export class AgendamentoRepositoryPrisma implements AgendamentoRepository {
  constructor(private readonly cliente: ClientePrisma) {}

  async criar(dados: NovoAgendamento): Promise<Agendamento> {
    const registro = await this.cliente.agendamento.create({
      data: {
        colaboradorId: dados.colaboradorId,
        periodoNumero: dados.periodoNumero,
        dataInicio: calendarDateParaDate(dados.dataInicio),
        quantidadeDias: dados.quantidadeDias,
      },
    })

    return paraAgendamento(registro)
  }

  async buscarPorId(id: number): Promise<Agendamento | null> {
    const registro = await this.cliente.agendamento.findUnique({ where: { id } })
    return registro ? paraAgendamento(registro) : null
  }

  async listarAtivosPorColaborador(colaboradorId: number): Promise<Agendamento[]> {
    const registros = await this.cliente.agendamento.findMany({
      where: { colaboradorId, status: "ativo" },
    })
    return registros.map(paraAgendamento)
  }

  async listarAtivosPorColaboradorEPeriodo(
    colaboradorId: number,
    periodoNumero: number,
  ): Promise<Agendamento[]> {
    const registros = await this.cliente.agendamento.findMany({
      where: { colaboradorId, periodoNumero, status: "ativo" },
    })
    return registros.map(paraAgendamento)
  }

  async listarTodosPorColaborador(colaboradorId: number): Promise<Agendamento[]> {
    const registros = await this.cliente.agendamento.findMany({ where: { colaboradorId } })
    return registros.map(paraAgendamento)
  }

  async cancelar(id: number): Promise<Agendamento> {
    const registro = await this.cliente.agendamento.update({
      where: { id },
      data: { status: "cancelado" },
    })
    return paraAgendamento(registro)
  }

  async executarComLockDoColaborador<T>(
    colaboradorId: number,
    operacao: (agendamentoRepositoryTransacional: AgendamentoRepository) => Promise<T>,
  ): Promise<T> {
    // `this.cliente` aqui só pode ser o `PrismaClient` de nível
    // superior (nunca um `tx`), porque `executarComLockDoColaborador`
    // não é chamado recursivamente de dentro de uma transação — é
    // sempre o ponto de entrada da transação.
    const prisma = this.cliente as PrismaClient

    return prisma.$transaction(async (tx) => {
      // Bloqueia a linha do colaborador até o fim desta transação —
      // qualquer outra transação concorrente que também tente dar lock
      // nesta mesma linha (via este mesmo mecanismo) espera até esta
      // transação concluir (commit ou rollback).
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM colaboradores WHERE id = ${colaboradorId} FOR UPDATE`,
      )

      // Nova instância, local a esta chamada, vinculada ao cliente de
      // transação `tx` — nunca compartilhada com outras chamadas
      // concorrentes, nunca reatribuída depois de criada.
      const repositorioTransacional = new AgendamentoRepositoryPrisma(tx)

      return operacao(repositorioTransacional)
    })
  }
}

function paraAgendamento(registro: {
  id: number
  colaboradorId: number
  periodoNumero: number
  dataInicio: Date
  quantidadeDias: number
  status: string
}): Agendamento {
  return {
    id: registro.id,
    colaboradorId: registro.colaboradorId,
    periodoNumero: registro.periodoNumero,
    dataInicio: dateParaCalendarDate(registro.dataInicio),
    quantidadeDias: registro.quantidadeDias,
    status: registro.status as StatusAgendamento,
  }
}
