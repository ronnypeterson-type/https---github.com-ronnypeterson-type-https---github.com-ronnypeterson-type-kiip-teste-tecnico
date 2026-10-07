// Regra R4 — Dia de início (ver CLAUDE.md, seção "6. Regras de negócio
// R1-R7"):
//
// O início das férias não pode ocorrer: no domingo; em feriado; nos dois
// dias anteriores a um domingo; nos dois dias anteriores a um feriado.
//
// Modelo (derivado e validado antes da implementação — ver análise
// prévia registrada na conversa de desenvolvimento): a data candidata
// `D` é bloqueada se, e somente se, pelo menos uma das seguintes
// condições for verdadeira:
//   - D é domingo;
//   - D é feriado;
//   - D+1 é domingo (D está 1 dia antes de um domingo);
//   - D+2 é domingo (D está 2 dias antes de um domingo);
//   - D+1 é feriado (D está 1 dia antes de um feriado);
//   - D+2 é feriado (D está 2 dias antes de um feriado).
//
// Essas 6 condições são uma união simples (OU) — quando domingo e
// feriado estão próximos (ex.: um feriado cai num domingo, ou nos dois
// dias seguintes a um domingo), a fórmula continua correta sem qualquer
// tratamento especial, porque união de conjuntos é naturalmente
// idempotente: não importa quantas das 6 condições sejam verdadeiras
// simultaneamente, o resultado final (bloqueado ou não) é o mesmo.
//
// Esta função avalia APENAS a data de início candidata. Não recebe
// duração, período aquisitivo ou qualquer outro dado — não mistura R2
// (concessivo), R3 (fracionamento) ou R5 (sobreposição).
//
// Esta função é pura: não acessa banco, HTTP ou qualquer estado externo.
// Não implementa R1, R2, R3, R5, R6 ou R7.

import { addDays, getDayOfWeek, DayOfWeek, type CalendarDate } from "../utils/calendar-date.js"
import { ehFeriado } from "./feriados.js"
import { RegraNegocioError } from "./regra-negocio-error.js"

/**
 * Verifica se `dataInicio` é um dia válido para iniciar férias, segundo a
 * regra R4 (não domingo, não feriado, não nos dois dias anteriores a
 * domingo ou feriado).
 */
export function ehInicioValidoR4(dataInicio: CalendarDate): boolean {
  const umDiaDepois = addDays(dataInicio, 1)
  const doisDiasDepois = addDays(dataInicio, 2)

  const bloqueadoPorDomingo =
    getDayOfWeek(dataInicio) === DayOfWeek.Sunday ||
    getDayOfWeek(umDiaDepois) === DayOfWeek.Sunday ||
    getDayOfWeek(doisDiasDepois) === DayOfWeek.Sunday

  const bloqueadoPorFeriado =
    ehFeriado(dataInicio) || ehFeriado(umDiaDepois) || ehFeriado(doisDiasDepois)

  return !bloqueadoPorDomingo && !bloqueadoPorFeriado
}

/**
 * Valida `dataInicio` contra a regra R4, lançando `RegraNegocioError`
 * (código "R4") com uma mensagem amigável caso a data não seja um início
 * válido. Não lança nada se a data for válida.
 */
export function validarDiaInicio(dataInicio: CalendarDate): void {
  if (!ehInicioValidoR4(dataInicio)) {
    throw new RegraNegocioError(
      "R4",
      "As férias não podem começar em um domingo, em um feriado, ou nos dois dias que antecedem um domingo ou feriado. Escolha outra data de início.",
    )
  }
}
