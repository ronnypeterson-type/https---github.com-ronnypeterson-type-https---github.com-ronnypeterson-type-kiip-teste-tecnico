// Tabela de feriados fornecida pelo teste técnico (ver CLAUDE.md, seção
// "6. Regras de negócio R1-R7", R4).
//
// Estes são EXATAMENTE os feriados fornecidos pelo enunciado, para os
// anos 2026, 2027 e 2028. Não há cálculo de feriados móveis (ex.: Páscoa,
// Carnaval), nem feriados de outros anos, nem um calendário nacional
// genérico — apenas esta lista literal e fixa, conforme exigido pelo
// CLAUDE.md ("NÃO simplificar esta regra... devem ser tratados exatamente
// conforme especificados, sem cálculo automático de feriados móveis").
//
// Para datas fora de 2026-2028, esta tabela não contém nenhum feriado —
// isso é uma limitação deliberada dos dados fornecidos pelo teste, não um
// bug: a regra R4 continua válida para a condição de domingo nesses
// casos, apenas sem a condição de feriado.

import { createCalendarDate, isEqual, type CalendarDate } from "../utils/calendar-date.js"

export const FERIADOS: readonly CalendarDate[] = [
  // 2026
  createCalendarDate(2026, 1, 1),
  createCalendarDate(2026, 4, 3),
  createCalendarDate(2026, 4, 21),
  createCalendarDate(2026, 5, 1),
  createCalendarDate(2026, 9, 7),
  createCalendarDate(2026, 10, 12),
  createCalendarDate(2026, 11, 2),
  createCalendarDate(2026, 11, 15),
  createCalendarDate(2026, 11, 20),
  createCalendarDate(2026, 12, 25),
  // 2027
  createCalendarDate(2027, 1, 1),
  createCalendarDate(2027, 3, 26),
  createCalendarDate(2027, 4, 21),
  createCalendarDate(2027, 5, 1),
  createCalendarDate(2027, 9, 7),
  createCalendarDate(2027, 10, 12),
  createCalendarDate(2027, 11, 2),
  createCalendarDate(2027, 11, 15),
  createCalendarDate(2027, 11, 20),
  createCalendarDate(2027, 12, 25),
  // 2028
  createCalendarDate(2028, 1, 1),
  createCalendarDate(2028, 4, 14),
  createCalendarDate(2028, 4, 21),
  createCalendarDate(2028, 5, 1),
  createCalendarDate(2028, 9, 7),
  createCalendarDate(2028, 10, 12),
  createCalendarDate(2028, 11, 2),
  createCalendarDate(2028, 11, 15),
  createCalendarDate(2028, 11, 20),
  createCalendarDate(2028, 12, 25),
]

/**
 * Verifica se uma data é feriado, conforme a tabela fixa fornecida pelo
 * teste técnico. Datas fora de 2026-2028 nunca são feriado, pois a
 * tabela não contém nenhuma entrada para esses anos.
 */
export function ehFeriado(data: CalendarDate): boolean {
  return FERIADOS.some((feriado) => isEqual(feriado, data))
}
