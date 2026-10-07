// Regra R1 — Período aquisitivo (ver CLAUDE.md, seção "6. Regras de
// negócio R1-R7"):
//
// A cada 12 meses o colaborador adquire 30 dias de férias. O período
// aquisitivo número N começa no aniversário de N-1 anos da data de
// admissão e termina no dia anterior ao aniversário seguinte (ou seja, no
// dia anterior ao início do período N+1). Quando o aniversário não existir
// naquele mês (ex.: admissão em 29/02 em um ano não bissexto de destino),
// utiliza-se o último dia existente daquele mês — essa regra já está
// implementada em `addYears` (ver calendar-date.ts) e é reaproveitada aqui
// sem duplicação.
//
// Esta função é pura: não acessa banco, HTTP ou qualquer estado externo.
// Não persiste nada — o período aquisitivo é sempre recalculado a partir
// da data de admissão e do número do período (decisão registrada em
// PLAN.md, seção "Atualização do plano — decisões de modelagem e
// domínio", item 1).
//
// Apenas R1 é implementada aqui. R2-R7, agendamento, saldo e qualquer
// outra regra de negócio ficam para etapas posteriores.

import { addDays, addYears, type CalendarDate } from "../utils/calendar-date.js"

/** Quantidade fixa de dias adquiridos por período aquisitivo, conforme R1. */
export const DIAS_ADQUIRIDOS_POR_PERIODO = 30

export interface PeriodoAquisitivo {
  readonly periodoNumero: number
  readonly dataInicio: CalendarDate
  readonly dataFim: CalendarDate
  readonly diasAdquiridos: number
}

/**
 * Calcula o período aquisitivo número `periodoNumero` de um colaborador
 * admitido em `dataAdmissao`, aplicando a regra R1.
 *
 * `periodoNumero` é 1-based: o período 1 é o primeiro, iniciado na própria
 * data de admissão (N-1 = 0 anos depois da admissão).
 *
 * @throws Error se `periodoNumero` não for um número inteiro maior ou
 *   igual a 1. A validade de `dataAdmissao` é garantida por quem a
 *   construiu (ver `createCalendarDate`/`fromISODateString` em
 *   calendar-date.ts) — esta função não duplica essa validação.
 */
export function calcularPeriodoAquisitivo(
  dataAdmissao: CalendarDate,
  periodoNumero: number,
): PeriodoAquisitivo {
  if (!Number.isInteger(periodoNumero) || periodoNumero < 1) {
    throw new Error(
      `Número de período aquisitivo inválido: ${periodoNumero}. Deve ser um número inteiro maior ou igual a 1.`,
    )
  }

  const dataInicio = addYears(dataAdmissao, periodoNumero - 1)
  const inicioPeriodoSeguinte = addYears(dataAdmissao, periodoNumero)
  const dataFim = addDays(inicioPeriodoSeguinte, -1)

  return {
    periodoNumero,
    dataInicio,
    dataFim,
    diasAdquiridos: DIAS_ADQUIRIDOS_POR_PERIODO,
  }
}
