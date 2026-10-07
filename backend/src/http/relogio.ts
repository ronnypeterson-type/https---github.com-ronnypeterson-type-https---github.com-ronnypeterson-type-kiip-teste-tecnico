// Relógio da borda HTTP: obtém a data CIVIL de "hoje" no fuso horário
// do projeto (America/Sao_Paulo), a partir de um instante.
//
// Contexto do bug corrigido: a implementação anterior de
// `hojeComoCalendarDate()` (em `serializacao.ts`) usava
// `new Date()` + `getUTCFullYear/getUTCMonth/getUTCDate`, isto é,
// calculava "hoje" no fuso UTC, não em America/Sao_Paulo (UTC-3). Como
// R6 depende diretamente de "hoje", isso podia fazer a API considerar
// já o dia seguinte entre ~21h00 e 23h59 (horário de Brasília) —
// exatamente o horário em que, em UTC, a data já virou. Exemplo real
// (reproduzido deterministicamente): o instante
// `2026-10-08T02:30:00Z` tem dia civil 8 em UTC, mas dia civil 7 em
// America/Sao_Paulo (23:30 do dia 7). R6 é uma regra sobre a data
// CIVIL do calendário do projeto, não sobre o instante UTC.
//
// Esta correção é estritamente de BORDA HTTP: nenhuma função de
// domínio passou a usar `Date`, nenhuma regra R1-R7 foi alterada, e
// nenhum cálculo de duração (soma/diferença de dias) usa timezone —
// apenas a leitura do instante "agora" é convertida para os três
// componentes civis (ano/mês/dia) corretos, via `Intl.DateTimeFormat`
// com `timeZone` fixo (não depende do timezone configurado no
// processo/máquina que executa o servidor).
//
// A função abaixo recebe o instante como parâmetro (em vez de chamar
// `new Date()` internamente) exatamente para permitir testar o caso de
// risco (virada de dia por timezone) de forma determinística, sem
// depender do relógio real da máquina em que os testes rodam — nem
// mexer no relógio do processo (ex.: fake timers).

import { createCalendarDate, type CalendarDate } from "../utils/calendar-date.js"

const FUSO_HORARIO_DO_PROJETO = "America/Sao_Paulo"

const formatadorDeDataCivil = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_HORARIO_DO_PROJETO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/**
 * Converte um instante (`Date`, que representa um ponto no tempo
 * absoluto, independentemente de timezone) para a data CIVIL
 * correspondente no fuso horário do projeto (America/Sao_Paulo).
 *
 * Não faz nenhuma aritmética de calendário (soma/diferença de dias) —
 * apenas lê, via `Intl.DateTimeFormat`, os componentes ano/mês/dia que
 * esse instante representa naquele fuso.
 */
export function dataCivilEmSaoPaulo(instante: Date): CalendarDate {
  const partes = formatadorDeDataCivil.formatToParts(instante)
  const valor = (tipo: "year" | "month" | "day") => {
    const parte = partes.find((p) => p.type === tipo)
    if (!parte) {
      throw new Error(`Falha ao extrair o componente "${tipo}" da data civil.`)
    }
    return Number(parte.value)
  }

  return createCalendarDate(valor("year"), valor("month"), valor("day"))
}

/**
 * "Hoje" na representação de calendário, segundo o relógio real do
 * sistema, já convertido para a data civil de America/Sao_Paulo. Usada
 * apenas nesta borda HTTP (nunca dentro do domínio — R6 sempre recebe
 * "hoje" como parâmetro explícito de `CalendarDate`, nunca calcula
 * internamente via `Date`).
 */
export function hojeComoCalendarDate(): CalendarDate {
  return dataCivilEmSaoPaulo(new Date())
}
