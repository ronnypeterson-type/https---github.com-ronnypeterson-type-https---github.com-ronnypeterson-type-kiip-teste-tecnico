// Caso de uso: listar agendamentos (ativos e cancelados) de um
// colaborador, com data final e valores financeiros calculados (R7).
//
// A listagem inclui agendamentos cancelados, pois o cancelamento é
// lógico (decisão registrada em PLAN.md) — o registro permanece no
// banco/fake, apenas com `status: "cancelado"`.
//
// Não há nenhuma regra R1-R5 envolvida aqui — apenas a derivação de
// `dataFim` (mesma fórmula já usada por R5, `addDays(dataInicio,
// quantidadeDias - 1)`) e o cálculo de R7 para exibição.

import { addDays, type CalendarDate } from "../utils/calendar-date.js"
import { calcularValoresFerias, type ValoresFerias } from "../domain/valores-ferias.js"
import { RecursoNaoEncontradoError } from "./erros.js"
import type { Agendamento, AgendamentoRepository, ColaboradorRepository } from "./repositories.js"

export interface AgendamentoComValores {
  readonly agendamento: Agendamento
  readonly dataFim: CalendarDate
  readonly valores: ValoresFerias
}

export interface ListarAgendamentosDependencias {
  readonly colaboradorRepository: ColaboradorRepository
  readonly agendamentoRepository: AgendamentoRepository
}

export async function listarAgendamentos(
  { colaboradorRepository, agendamentoRepository }: ListarAgendamentosDependencias,
  colaboradorId: number,
): Promise<AgendamentoComValores[]> {
  const colaborador = await colaboradorRepository.buscarPorId(colaboradorId)

  if (!colaborador) {
    throw new RecursoNaoEncontradoError(`Colaborador com id ${colaboradorId} não encontrado.`)
  }

  const agendamentos = await agendamentoRepository.listarTodosPorColaborador(colaboradorId)

  return agendamentos.map((agendamento) => ({
    agendamento,
    dataFim: addDays(agendamento.dataInicio, agendamento.quantidadeDias - 1),
    valores: calcularValoresFerias(colaborador.salarioCentavos, agendamento.quantidadeDias),
  }))
}
