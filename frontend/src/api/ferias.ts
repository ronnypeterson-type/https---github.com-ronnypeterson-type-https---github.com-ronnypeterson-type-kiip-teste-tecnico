// Chamadas HTTP relacionadas a agendamento/cancelamento/listagem de
// férias. Nenhuma validação de regra de negócio (R1-R7) é feita aqui —
// a função apenas envia a intenção do usuário (periodoNumero,
// dataInicio, quantidadeDias) e devolve exatamente o que a API
// respondeu, incluindo rejeições (tratadas como `ErroApi`, lançado por
// `requisitar`).

import { requisitar } from "./cliente.js"
import type { Agendamento, NovoAgendamentoEntrada } from "../types/api.js"

export function listarAgendamentos(colaboradorId: number): Promise<{ agendamentos: Agendamento[] }> {
  return requisitar(`/colaboradores/${colaboradorId}/ferias`)
}

export function agendarFerias(
  colaboradorId: number,
  entrada: NovoAgendamentoEntrada,
): Promise<Agendamento> {
  return requisitar(`/colaboradores/${colaboradorId}/ferias`, {
    method: "POST",
    body: JSON.stringify(entrada),
  })
}

export function cancelarAgendamento(
  colaboradorId: number,
  agendamentoId: number,
): Promise<{ id: number; status: string }> {
  return requisitar(`/colaboradores/${colaboradorId}/ferias/${agendamentoId}`, {
    method: "DELETE",
  })
}
