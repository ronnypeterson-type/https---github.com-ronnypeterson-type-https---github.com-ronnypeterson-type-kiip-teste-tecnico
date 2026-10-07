// Conversões na borda HTTP entre os tipos JSON (string, number) e os
// tipos de domínio/aplicação (`CalendarDate`, `bigint` de centavos).
//
// Esta é a camada que faz a ponte entre o mundo HTTP/JSON e o mundo
// interno do domínio — nenhuma outra camada (controllers excluídos)
// deveria precisar converter `CalendarDate`↔string ou `bigint`↔string
// diretamente.
//
// ## Datas
//
// Reutiliza `toISODateString`/`fromISODateString`, já existentes em
// `utils/calendar-date.ts` — não duplica a lógica de parsing/formatação
// de data. A API sempre recebe e devolve datas como string "YYYY-MM-DD",
// nunca timestamp, nunca `Date`.
//
// ## Dinheiro
//
// R7 representa valores monetários como `bigint` de centavos no
// domínio. `bigint` NÃO pode ser serializado diretamente por
// `JSON.stringify` (lança `TypeError: Do not know how to serialize a
// BigInt`) — por isso esta camada converte `bigint` de centavos para
// uma STRING decimal com 2 casas (ex.: `163333n` → `"1633.33"`), nunca
// para `number` (evitando reintroduzir erro de ponto flutuante na
// borda). A conversão usa apenas aritmética de `bigint` (divisão e
// resto inteiros), nunca `Number`.

import { fromISODateString, toISODateString, type CalendarDate } from "../utils/calendar-date.js"

export class EntradaHttpInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = "EntradaHttpInvalidaError"
  }
}

/**
 * Converte uma string "YYYY-MM-DD" vinda do request para `CalendarDate`,
 * lançando `EntradaHttpInvalidaError` (não `RegraNegocioError` — é um
 * erro de formato de entrada HTTP, não uma regra de negócio) se o
 * formato ou a data forem inválidos.
 */
export function parseDataDoRequest(valor: unknown, nomeCampo: string): CalendarDate {
  if (typeof valor !== "string") {
    throw new EntradaHttpInvalidaError(
      `O campo "${nomeCampo}" é obrigatório e deve ser uma string no formato YYYY-MM-DD.`,
    )
  }

  try {
    return fromISODateString(valor)
  } catch {
    throw new EntradaHttpInvalidaError(
      `O campo "${nomeCampo}" deve estar no formato YYYY-MM-DD e representar uma data de calendário válida. Valor recebido: "${valor}".`,
    )
  }
}

/** Formata um `CalendarDate` como string "YYYY-MM-DD" para a resposta HTTP. */
export function formatarData(data: CalendarDate): string {
  return toISODateString(data)
}

/**
 * Converte o valor de salário recebido no request (string decimal, ex.
 * "3500.00" ou "3500.5") para `bigint` de centavos, sem passar por
 * `Number` em nenhum momento — usa apenas parsing de string e
 * aritmética de `bigint`.
 */
export function parseSalarioDoRequest(valor: unknown): bigint {
  if (typeof valor !== "string" && typeof valor !== "number") {
    throw new EntradaHttpInvalidaError(
      `O campo "salarioMensal" é obrigatório e deve ser um valor decimal (ex.: "3500.00").`,
    )
  }

  const texto = String(valor).trim()
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto)

  if (!match) {
    throw new EntradaHttpInvalidaError(
      `O campo "salarioMensal" deve ser um valor decimal positivo com até 2 casas (ex.: "3500.00"). Valor recebido: "${texto}".`,
    )
  }

  const [, parteInteira, parteDecimal = ""] = match
  const centavos = parteDecimal.padEnd(2, "0")

  return BigInt(parteInteira) * 100n + BigInt(centavos)
}

/**
 * Converte um `bigint` de centavos para uma string decimal com 2 casas
 * (ex.: `163333n` → `"1633.33"`), usando apenas aritmética de `bigint`
 * — nunca `Number`, preservando exatamente os centavos.
 */
export function formatarCentavos(centavos: bigint): string {
  const negativo = centavos < 0n
  const valorAbsoluto = negativo ? -centavos : centavos

  const reais = valorAbsoluto / 100n
  const restoCentavos = valorAbsoluto % 100n

  const sinal = negativo ? "-" : ""
  return `${sinal}${reais.toString()}.${restoCentavos.toString().padStart(2, "0")}`
}

/**
 * Converte um número inteiro de dias vindo do request (sempre `number`
 * em JSON, nunca string) para `number`, validando que é um inteiro
 * positivo. Não confundir com validação de regra de negócio (R3) — este
 * é apenas o formato estrutural do campo.
 */
export function parseQuantidadeDiasDoRequest(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor <= 0) {
    throw new EntradaHttpInvalidaError(
      `O campo "quantidadeDias" é obrigatório e deve ser um número inteiro positivo.`,
    )
  }

  return valor
}

/**
 * Converte um número de período aquisitivo vindo do request para
 * `number`, validando que é um inteiro positivo (formato estrutural,
 * não a regra de negócio de R1/R2 sobre qual período é válido).
 */
export function parsePeriodoNumeroDoRequest(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 1) {
    throw new EntradaHttpInvalidaError(
      `O campo "periodoNumero" é obrigatório e deve ser um número inteiro maior ou igual a 1.`,
    )
  }

  return valor
}

/**
 * Converte um parâmetro de rota (ex.: `:id`) para `number`, validando
 * que é um inteiro positivo.
 */
export function parseIdDaRota(valor: string, nomeParametro: string): number {
  const id = Number(valor)

  if (!Number.isInteger(id) || id <= 0) {
    throw new EntradaHttpInvalidaError(
      `O parâmetro "${nomeParametro}" deve ser um número inteiro positivo. Valor recebido: "${valor}".`,
    )
  }

  return id
}
