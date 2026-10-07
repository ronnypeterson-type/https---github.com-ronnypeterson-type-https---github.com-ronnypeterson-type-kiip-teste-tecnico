// Repository fake (em memória) de Agendamento — infraestrutura de
// TESTE apenas, implementa a interface `AgendamentoRepository` da
// camada de aplicação, sem nenhuma dependência de Prisma/banco.
//
// Usado pelos testes unitários dos application services, para testar a
// orquestração das regras (R1-R7) sem precisar de PostgreSQL.

import { RecursoNaoEncontradoError } from "../erros.js"
import type { Agendamento, AgendamentoRepository, NovoAgendamento } from "../repositories.js"

export class AgendamentoRepositoryFake implements AgendamentoRepository {
  private readonly agendamentos = new Map<number, Agendamento>()
  private proximoId = 1

  async criar(dados: NovoAgendamento): Promise<Agendamento> {
    const agendamento: Agendamento = { id: this.proximoId, status: "ativo", ...dados }
    this.agendamentos.set(agendamento.id, agendamento)
    this.proximoId += 1
    return agendamento
  }

  async buscarPorId(id: number): Promise<Agendamento | null> {
    return this.agendamentos.get(id) ?? null
  }

  async listarAtivosPorColaborador(colaboradorId: number): Promise<Agendamento[]> {
    return Array.from(this.agendamentos.values()).filter(
      (agendamento) => agendamento.colaboradorId === colaboradorId && agendamento.status === "ativo",
    )
  }

  async listarAtivosPorColaboradorEPeriodo(
    colaboradorId: number,
    periodoNumero: number,
  ): Promise<Agendamento[]> {
    return Array.from(this.agendamentos.values()).filter(
      (agendamento) =>
        agendamento.colaboradorId === colaboradorId &&
        agendamento.periodoNumero === periodoNumero &&
        agendamento.status === "ativo",
    )
  }

  async listarTodosPorColaborador(colaboradorId: number): Promise<Agendamento[]> {
    return Array.from(this.agendamentos.values()).filter(
      (agendamento) => agendamento.colaboradorId === colaboradorId,
    )
  }

  async cancelar(id: number): Promise<Agendamento> {
    const agendamento = this.agendamentos.get(id)

    if (!agendamento) {
      throw new RecursoNaoEncontradoError(`Agendamento com id ${id} não encontrado.`)
    }

    const atualizado: Agendamento = { ...agendamento, status: "cancelado" }
    this.agendamentos.set(id, atualizado)
    return atualizado
  }

  // Implementação fake: não há concorrência real a serializar numa
  // estrutura em memória de processo único usada apenas em testes
  // sequenciais — apenas chama `operacao(this)` diretamente, sem lock.
  // `colaboradorId` não é usado aqui (ver interface para a justificativa).
  // Passa `this` (não uma cópia) porque não há necessidade de isolar
  // estado entre chamadas nesta implementação fake — ela não tem nenhum
  // campo mutável de "cliente ativo" para começar (diferente da
  // implementação Prisma, que precisa criar uma nova instância vinculada
  // à transação).
  async executarComLockDoColaborador<T>(
    _colaboradorId: number,
    operacao: (agendamentoRepositoryTransacional: AgendamentoRepository) => Promise<T>,
  ): Promise<T> {
    return operacao(this)
  }
}
