// Caso de uso: cancelar agendamento.
//
// Orquestra R6 (data de início futura) e a decisão registrada em
// PLAN.md (seção "Atualização do plano — decisões da camada de
// aplicação", item 2): o cancelamento é lógico — altera `status` para
// "cancelado", nunca remove o registro.
//
// "Agendamento já cancelado" NÃO é uma violação de R6 (R6 fala sobre a
// DATA de início, não sobre o ESTADO do registro) — é um conflito de
// estado, usando `ConflitoDeEstadoError` (ver erros.ts), não
// `RegraNegocioError`.

import type { CalendarDate } from "../utils/calendar-date.js"
import { validarCancelamentoFuturo } from "../domain/data-atual.js"
import { ConflitoDeEstadoError, RecursoNaoEncontradoError } from "./erros.js"
import type { Agendamento, AgendamentoRepository } from "./repositories.js"

export interface CancelarAgendamentoDependencias {
  readonly agendamentoRepository: AgendamentoRepository
}

export async function cancelarAgendamento(
  { agendamentoRepository }: CancelarAgendamentoDependencias,
  agendamentoId: number,
  hoje: CalendarDate,
): Promise<Agendamento> {
  const agendamento = await agendamentoRepository.buscarPorId(agendamentoId)

  if (!agendamento) {
    throw new RecursoNaoEncontradoError(`Agendamento com id ${agendamentoId} não encontrado.`)
  }

  if (agendamento.status === "cancelado") {
    throw new ConflitoDeEstadoError("Este agendamento já foi cancelado anteriormente.")
  }

  validarCancelamentoFuturo(agendamento.dataInicio, hoje)

  return agendamentoRepository.cancelar(agendamentoId)
}
