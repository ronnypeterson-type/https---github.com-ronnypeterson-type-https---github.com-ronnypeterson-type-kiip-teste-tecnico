// Conversões entre os tipos do Prisma (infraestrutura) e os tipos do
// domínio/aplicação (`CalendarDate`, `bigint` de centavos).
//
// Esta é a ÚNICA camada autorizada a conhecer tanto Prisma quanto os
// tipos de domínio — nem o domínio, nem a camada de aplicação (use
// cases), importam `@prisma/client` (ver CLAUDE.md, seção "9. Separação
// de responsabilidades", e PLAN.md, seção "Atualização do plano —
// decisões da camada de aplicação").
//
// ## Dinheiro: Prisma.Decimal ↔ bigint de centavos
//
// A coluna `salario_mensal` é `NUMERIC(10,2)` no PostgreSQL, lida pelo
// Prisma Client como `Prisma.Decimal` (precisão arbitrária, nunca
// `number`). A conversão para `bigint` de centavos usa exclusivamente
// os métodos do próprio `Decimal` (`times`, `toFixed`) — NUNCA `Number`
// em nenhum ponto, preservando exatamente os centavos (verificado por
// execução real antes desta implementação: 3500.00 → 350000n, 3500.50 →
// 350050n, 0.01 → 1n, 99999999.99 → 9999999999n — o valor máximo
// possível em NUMERIC(10,2)).
//
// ## Datas: Prisma DateTime (@db.Date) ↔ CalendarDate
//
// Colunas `@db.Date` são devolvidas pelo Prisma Client como objetos
// `Date` do JavaScript, à meia-noite UTC (ex.: "2026-03-16" vira
// `2026-03-16T00:00:00.000Z`). Ler os componentes de data usando os
// métodos LOCAIS (`getFullYear`/`getMonth`/`getDate`) depende do
// timezone do processo Node e pode devolver o dia ERRADO — confirmado
// por execução real nesta implementação: com o processo em
// `America/Sao_Paulo` (UTC-3), `2026-03-16T00:00:00Z` lido com métodos
// locais devolve 15/03/2026 (um dia a menos). Por isso, esta conversão
// usa EXCLUSIVAMENTE os métodos UTC (`getUTCFullYear`/`getUTCMonth`/
// `getUTCDate`), que devolvem o dia correto (16/03/2026)
// independentemente do timezone do processo.
//
// Na direção inversa (CalendarDate → Date, para gravar no banco), o
// `Date` é construído com `Date.UTC(...)`, pela mesma razão: garantir
// que o valor enviado ao Prisma representa exatamente o dia pretendido,
// sem depender do timezone local do processo.

import { Prisma } from "@prisma/client"
import { createCalendarDate, type CalendarDate } from "../../utils/calendar-date.js"

/**
 * Converte um `Prisma.Decimal` (coluna `NUMERIC(10,2)`) para `bigint` de
 * centavos, sem passar por `Number` em nenhum momento.
 */
export function decimalParaCentavos(decimal: Prisma.Decimal): bigint {
  return BigInt(decimal.times(100).toFixed(0))
}

/**
 * Converte um `bigint` de centavos para `Prisma.Decimal` (para gravar na
 * coluna `NUMERIC(10,2)`), sem passar por `Number` em nenhum momento.
 */
export function centavosParaDecimal(centavos: bigint): Prisma.Decimal {
  return new Prisma.Decimal(centavos.toString()).dividedBy(100)
}

/**
 * Converte um `Date` do Prisma (coluna `@db.Date`) para `CalendarDate`,
 * usando exclusivamente os componentes UTC — nunca os locais (ver
 * cabeçalho do arquivo para a justificativa, confirmada por execução
 * real).
 */
export function dateParaCalendarDate(data: Date): CalendarDate {
  return createCalendarDate(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate())
}

/**
 * Converte um `CalendarDate` para `Date` (para gravar em uma coluna
 * `@db.Date` via Prisma), usando `Date.UTC` para garantir que o dia
 * gravado é exatamente o pretendido, independentemente do timezone do
 * processo.
 */
export function calendarDateParaDate(data: CalendarDate): Date {
  return new Date(Date.UTC(data.year, data.month - 1, data.day))
}
