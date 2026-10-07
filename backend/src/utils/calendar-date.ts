// CalendarDate — value object de data de calendário (ano, mês, dia).
//
// Motivação (ver CLAUDE.md "Regras de datas" e PLAN.md "Atualização do plano
// — decisões de modelagem e domínio", seção 3): as datas de negócio deste
// sistema (admissão, início de férias, feriados, "hoje") são datas de
// calendário civis, sem horário e sem timezone. O objeto `Date` do
// JavaScript representa um instante (milissegundos desde a época UTC) e
// está sujeito a efeitos de timezone/horário de verão ao ser construído ou
// lido a partir de componentes locais — por isso NÃO é usado aqui para
// nenhuma operação de domínio.
//
// Toda aritmética de calendário (soma de dias, diferença, comparação) é
// feita convertendo a data para um número inteiro de "dia absoluto"
// (quantidade de dias desde uma época fixa, calculada por fórmula de
// calendário puramente numérica — sem relação com `Date`/milissegundos) e
// de volta. Isso evita tanto o uso de `Date` quanto a necessidade de somar
// dia a dia manualmente mês a mês.
//
// Este arquivo fornece apenas operações GENÉRICAS de calendário. As regras
// de negócio do teste (R1-R7) são implementadas em outra camada, usando
// estas operações como base.

export interface CalendarDate {
  readonly year: number
  readonly month: number // 1-12
  readonly day: number // 1-31, válido para o mês/ano
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * Indica se um ano é bissexto, pela regra do calendário gregoriano:
 * divisível por 4, exceto séculos (divisíveis por 100) que não sejam
 * também divisíveis por 400.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Último dia válido de um mês (1-12) em um determinado ano, considerando
 * fevereiro em anos bissextos.
 */
export function lastDayOfMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Mês inválido: ${month}. Deve ser um inteiro entre 1 e 12.`)
  }

  if (month === 2 && isLeapYear(year)) {
    return 29
  }

  return DAYS_IN_MONTH[month - 1]
}

/**
 * Cria um CalendarDate validando que a combinação ano/mês/dia é uma data
 * de calendário real (rejeita mês 0/13, dia 0, dia além do último dia do
 * mês, incluindo 29/02 em ano não bissexto).
 */
export function createCalendarDate(year: number, month: number, day: number): CalendarDate {
  if (!Number.isInteger(year)) {
    throw new Error(`Ano inválido: ${year}. Deve ser um número inteiro.`)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Mês inválido: ${month}. Deve ser um inteiro entre 1 e 12.`)
  }

  const maxDay = lastDayOfMonth(year, month)

  if (!Number.isInteger(day) || day < 1 || day > maxDay) {
    throw new Error(
      `Dia inválido: ${day}. Para ${String(month).padStart(2, "0")}/${year}, deve ser um inteiro entre 1 e ${maxDay}.`,
    )
  }

  return { year, month, day }
}

/**
 * Converte uma data de calendário para o número de dias absolutos desde
 * uma época fixa (0001-01-01 do calendário proléptico gregoriano, dia 0).
 * Fórmula puramente numérica (sem Date/timezone), usada como base comum
 * para soma de dias, diferença e comparação.
 */
function toAbsoluteDays(date: CalendarDate): number {
  const { year, month, day } = date

  // Dias completos acumulados em anos anteriores a `year`, a partir do
  // ano 1 (contagem gregoriana proléptica: a cada 4 anos um bissexto,
  // exceto séculos não divisíveis por 400).
  const y = year - 1
  const daysBeforeYear = y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)

  // Dias completos acumulados nos meses anteriores ao mês atual, dentro do
  // próprio ano (considerando se `year` é bissexto).
  let daysBeforeMonth = 0
  for (let m = 1; m < month; m++) {
    daysBeforeMonth += lastDayOfMonth(year, m)
  }

  return daysBeforeYear + daysBeforeMonth + (day - 1)
}

// `toAbsoluteDays` usa como época (dia 0) a data 0001-01-01 do calendário
// proléptico gregoriano. A fórmula fechada abaixo (`civilFromDaysSinceEpoch1970`,
// algoritmo de Howard Hinnant, de domínio público — ver
// https://howardhinnant.github.io/date_algorithms.html#civil_from_days) usa
// como época 1970-01-01. `EPOCH_1970_IN_DAYS_SINCE_YEAR_1` é a distância fixa
// entre as duas épocas, nessa mesma convenção de dia absoluto (calculada e
// verificada separadamente, nunca recalculada em tempo de execução):
// `1970-01-01` corresponde ao dia `719162` desde `0001-01-01`.
const EPOCH_1970_IN_DAYS_SINCE_YEAR_1 = 719162

/**
 * Conversão fechada (sem aproximação, sem loop, O(1)) de uma contagem de
 * dias desde 1970-01-01 para os componentes {y, m, d} do calendário civil
 * gregoriano. Algoritmo `civil_from_days` de Howard Hinnant: usa somente
 * divisões e módulos inteiros, deslocando internamente o início do ano
 * civil para 1º de março (assim fevereiro, com seu dia variável, fica
 * sempre como último mês do "ano" interno, simplificando a aritmética de
 * bissextos sem nenhum caso especial).
 */
function civilFromDaysSinceEpoch1970(daysSinceEpoch: number): CalendarDate {
  const z = daysSinceEpoch + 719468 // desloca a época para 0000-03-01
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097)
  const doe = z - era * 146097 // dia dentro da era de 400 anos: [0, 146096]
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  ) // ano dentro da era: [0, 399]
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)) // dia do ano civil (começando em 1º de março): [0, 365]
  const mp = Math.floor((5 * doy + 2) / 153) // mês civil (começando em março = 0): [0, 11]
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1 // dia do mês: [1, 31]
  const m = mp + (mp < 10 ? 3 : -9) // mês civil [0,11] -> mês do calendário [1,12]
  const year = y + (m <= 2 ? 1 : 0) // ano civil (começa em março) -> ano do calendário

  return { year, month: m, day: d }
}

/**
 * Converte um número de dias absolutos (ver `toAbsoluteDays`, época
 * 0001-01-01) de volta para uma data de calendário, reutilizando a
 * conversão fechada acima após deslocar para a época 1970-01-01.
 */
function fromAbsoluteDays(totalDays: number): CalendarDate {
  const daysSinceEpoch1970 = totalDays - EPOCH_1970_IN_DAYS_SINCE_YEAR_1
  return civilFromDaysSinceEpoch1970(daysSinceEpoch1970)
}

/** Compara duas datas: retorna negativo se a < b, positivo se a > b, 0 se iguais. */
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  return toAbsoluteDays(a) - toAbsoluteDays(b)
}

export function isBefore(a: CalendarDate, b: CalendarDate): boolean {
  return compareCalendarDates(a, b) < 0
}

export function isAfter(a: CalendarDate, b: CalendarDate): boolean {
  return compareCalendarDates(a, b) > 0
}

export function isEqual(a: CalendarDate, b: CalendarDate): boolean {
  return compareCalendarDates(a, b) === 0
}

/**
 * Soma (ou subtrai, se `days` for negativo) uma quantidade de dias a uma
 * data de calendário.
 */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  if (!Number.isInteger(days)) {
    throw new Error(`Quantidade de dias inválida: ${days}. Deve ser um número inteiro.`)
  }

  return fromAbsoluteDays(toAbsoluteDays(date) + days)
}

/**
 * Diferença em dias entre duas datas: `diffInDays(a, b) = b - a`.
 * Retorna 0 para datas iguais, positivo se `b` é depois de `a`, negativo
 * se `b` é antes de `a`.
 */
export function diffInDays(a: CalendarDate, b: CalendarDate): number {
  return toAbsoluteDays(b) - toAbsoluteDays(a)
}

/**
 * Soma (ou subtrai, se `years` for negativo) uma quantidade de anos a uma
 * data de calendário, preservando o dia quando possível. Quando o dia de
 * origem não existir no mês de destino (caso de 29/02 em ano não
 * bissexto), usa o último dia válido daquele mês — mesma regra aplicada
 * pelo enunciado do teste para aniversários de admissão em 29/02.
 */
export function addYears(date: CalendarDate, years: number): CalendarDate {
  if (!Number.isInteger(years)) {
    throw new Error(`Quantidade de anos inválida: ${years}. Deve ser um número inteiro.`)
  }

  const targetYear = date.year + years
  const maxDay = lastDayOfMonth(targetYear, date.month)
  const day = Math.min(date.day, maxDay)

  return { year: targetYear, month: date.month, day }
}

/** Formata um CalendarDate como string "YYYY-MM-DD". */
export function toISODateString(date: CalendarDate): string {
  const yyyy = String(date.year).padStart(4, "0")
  const mm = String(date.month).padStart(2, "0")
  const dd = String(date.day).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Converte uma string no formato estrito "YYYY-MM-DD" para CalendarDate,
 * validando o formato e a validade da data resultante. Rejeita qualquer
 * formato diferente (incluindo datas com horário/timezone).
 */
export function fromISODateString(value: string): CalendarDate {
  const match = ISO_DATE_PATTERN.exec(value)

  if (!match) {
    throw new Error(`Formato de data inválido: "${value}". Esperado "YYYY-MM-DD".`)
  }

  const [, yearStr, monthStr, dayStr] = match
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  return createCalendarDate(year, month, day)
}
