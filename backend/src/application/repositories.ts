// Interfaces de repository da camada de aplicação.
//
// Estas interfaces definem o contrato que a camada de aplicação (use
// cases) depende — nunca uma implementação concreta. A implementação
// real (Prisma) e a implementação fake (em memória, usada nos testes
// desta etapa) implementam a mesma interface, permitindo testar a
// orquestração das regras sem PostgreSQL (ver CLAUDE.md, seção "9.
// Separação de responsabilidades": "repositories devem cuidar
// exclusivamente do acesso aos dados").
//
// Os tipos de entidade abaixo (`Colaborador`, `Agendamento`) já usam os
// tipos de domínio (`CalendarDate` para datas, `bigint` de centavos para
// o salário) — a conversão de/para `Prisma.Decimal`/`Date` do banco é
// responsabilidade exclusiva da futura implementação Prisma do
// repository, nunca desta interface nem dos use cases.
//
// Nenhuma regra R1-R7 é implementada aqui — apenas os métodos de
// persistência estritamente necessários para os 5 casos de uso desta
// etapa (nenhum método especulativo).

import type { CalendarDate } from "../utils/calendar-date.js"
import type { StatusAgendamento } from "./status-agendamento.js"

export interface Colaborador {
  readonly id: number
  readonly nome: string
  readonly dataAdmissao: CalendarDate
  readonly salarioCentavos: bigint
}

export type NovoColaborador = Omit<Colaborador, "id">

export interface Agendamento {
  readonly id: number
  readonly colaboradorId: number
  readonly periodoNumero: number
  readonly dataInicio: CalendarDate
  readonly quantidadeDias: number
  readonly status: StatusAgendamento
}

export type NovoAgendamento = Omit<Agendamento, "id" | "status">

export interface ColaboradorRepository {
  criar(dados: NovoColaborador): Promise<Colaborador>
  buscarPorId(id: number): Promise<Colaborador | null>
  listar(): Promise<Colaborador[]>
}

export interface AgendamentoRepository {
  criar(dados: NovoAgendamento): Promise<Agendamento>
  buscarPorId(id: number): Promise<Agendamento | null>
  listarAtivosPorColaborador(colaboradorId: number): Promise<Agendamento[]>
  listarAtivosPorColaboradorEPeriodo(
    colaboradorId: number,
    periodoNumero: number,
  ): Promise<Agendamento[]>
  listarTodosPorColaborador(colaboradorId: number): Promise<Agendamento[]>
  cancelar(id: number): Promise<Agendamento>

  /**
   * Executa `operacao` dentro de uma transação de banco que bloqueia a
   * linha do colaborador `colaboradorId` (via `SELECT ... FOR UPDATE`)
   * durante toda a duração da operação — necessário para que o fluxo
   * "ler saldo/sobreposição atual → validar R3/R5 → inserir
   * agendamento" seja atômico em relação a outras requisições
   * concorrentes para o MESMO colaborador (ver PLAN.md, seção
   * "Atualização do plano — decisões de persistência e concorrência").
   *
   * IMPORTANTE: `operacao` recebe como argumento um
   * `AgendamentoRepository` com ESCOPO DA TRANSAÇÃO — todas as
   * chamadas aos métodos deste repository recebido (nunca do
   * repository original, fechado no closure de quem chamou) devem ser
   * feitas através dele, para que de fato aconteçam dentro da mesma
   * transação/lock. Esse repository de escopo é um objeto novo e
   * imutável criado a cada chamada — não há nenhum estado mutável
   * compartilhado entre chamadas concorrentes (ver implementação
   * Prisma para a garantia concreta).
   *
   * Este método NÃO contém nenhuma regra de negócio: apenas inicia a
   * transação e o lock, e delega toda a lógica (leitura, validação R1-R6,
   * escrita) para o callback `operacao`, que é fornecido pelo
   * application service — a orquestração das regras continua
   * inteiramente no service, nunca no repository.
   *
   * A implementação fake (em memória, usada nos testes desta e das
   * etapas anteriores) não tem concorrência real para serializar — por
   * isso apenas chama `operacao(this)` diretamente, sem nenhum lock
   * (não há necessidade de lock numa estrutura em memória de processo
   * único usada só em testes sequenciais).
   */
  executarComLockDoColaborador<T>(
    colaboradorId: number,
    operacao: (agendamentoRepositoryTransacional: AgendamentoRepository) => Promise<T>,
  ): Promise<T>
}
