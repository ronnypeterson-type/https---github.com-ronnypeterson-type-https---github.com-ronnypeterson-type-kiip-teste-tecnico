import { describe, expect, it } from "vitest"
import {
  addDays,
  addYears,
  compareCalendarDates,
  createCalendarDate,
  diffInDays,
  fromISODateString,
  isAfter,
  isBefore,
  isEqual,
  isLeapYear,
  lastDayOfMonth,
  toISODateString,
} from "../../src/utils/calendar-date.js"

describe("CalendarDate", () => {
  describe("datas normais", () => {
    it("cria 2026-10-07 corretamente", () => {
      const date = createCalendarDate(2026, 10, 7)
      expect(date).toEqual({ year: 2026, month: 10, day: 7 })
      expect(toISODateString(date)).toBe("2026-10-07")
    })
  })

  describe("datas inválidas", () => {
    it("rejeita mês 0", () => {
      expect(() => createCalendarDate(2026, 0, 1)).toThrow()
    })

    it("rejeita mês 13", () => {
      expect(() => createCalendarDate(2026, 13, 1)).toThrow()
    })

    it("rejeita dia 0", () => {
      expect(() => createCalendarDate(2026, 1, 0)).toThrow()
    })

    it("rejeita dia maior que o último dia do mês", () => {
      expect(() => createCalendarDate(2026, 4, 31)).toThrow() // abril tem 30 dias
    })

    it("rejeita 29/02 em ano não bissexto", () => {
      expect(() => createCalendarDate(2026, 2, 29)).toThrow()
    })

    it("aceita 29/02 em ano bissexto", () => {
      expect(() => createCalendarDate(2024, 2, 29)).not.toThrow()
    })
  })

  describe("isLeapYear", () => {
    it("2024 é bissexto", () => {
      expect(isLeapYear(2024)).toBe(true)
    })

    it("2028 é bissexto", () => {
      expect(isLeapYear(2028)).toBe(true)
    })

    it("2026 não é bissexto", () => {
      expect(isLeapYear(2026)).toBe(false)
    })

    it("2000 é bissexto (divisível por 400)", () => {
      expect(isLeapYear(2000)).toBe(true)
    })

    it("1900 não é bissexto (divisível por 100, não por 400)", () => {
      expect(isLeapYear(1900)).toBe(false)
    })
  })

  describe("lastDayOfMonth", () => {
    it("fevereiro em ano normal tem 28 dias", () => {
      expect(lastDayOfMonth(2026, 2)).toBe(28)
    })

    it("fevereiro em ano bissexto tem 29 dias", () => {
      expect(lastDayOfMonth(2024, 2)).toBe(29)
    })

    it("abril tem 30 dias", () => {
      expect(lastDayOfMonth(2026, 4)).toBe(30)
    })

    it("maio tem 31 dias", () => {
      expect(lastDayOfMonth(2026, 5)).toBe(31)
    })

    it("dezembro tem 31 dias", () => {
      expect(lastDayOfMonth(2026, 12)).toBe(31)
    })
  })

  describe("addDays", () => {
    it("soma dias dentro do mesmo mês", () => {
      const result = addDays(createCalendarDate(2026, 10, 7), 5)
      expect(result).toEqual({ year: 2026, month: 10, day: 12 })
    })

    it("soma dias atravessando o mês", () => {
      const result = addDays(createCalendarDate(2026, 10, 30), 5)
      expect(result).toEqual({ year: 2026, month: 11, day: 4 })
    })

    it("soma dias atravessando o ano", () => {
      const result = addDays(createCalendarDate(2026, 12, 29), 5)
      expect(result).toEqual({ year: 2027, month: 1, day: 3 })
    })

    it("28/02/2024 + 1 dia = 29/02/2024 (ano bissexto)", () => {
      const result = addDays(createCalendarDate(2024, 2, 28), 1)
      expect(result).toEqual({ year: 2024, month: 2, day: 29 })
    })

    it("29/02/2024 + 1 dia = 01/03/2024", () => {
      const result = addDays(createCalendarDate(2024, 2, 29), 1)
      expect(result).toEqual({ year: 2024, month: 3, day: 1 })
    })

    it("subtrai dias quando o valor é negativo", () => {
      const result = addDays(createCalendarDate(2026, 3, 1), -1)
      expect(result).toEqual({ year: 2026, month: 2, day: 28 })
    })
  })

  describe("diffInDays", () => {
    it("mesma data resulta em 0", () => {
      const date = createCalendarDate(2026, 10, 7)
      expect(diffInDays(date, date)).toBe(0)
    })

    it("datas consecutivas resultam em 1", () => {
      const a = createCalendarDate(2026, 10, 7)
      const b = createCalendarDate(2026, 10, 8)
      expect(diffInDays(a, b)).toBe(1)
    })

    it("calcula diferença atravessando mês", () => {
      const a = createCalendarDate(2026, 10, 30)
      const b = createCalendarDate(2026, 11, 2)
      expect(diffInDays(a, b)).toBe(3)
    })

    it("calcula diferença atravessando ano", () => {
      const a = createCalendarDate(2026, 12, 30)
      const b = createCalendarDate(2027, 1, 2)
      expect(diffInDays(a, b)).toBe(3)
    })

    it("calcula diferença incluindo passagem por 29/02 em ano bissexto", () => {
      const a = createCalendarDate(2024, 2, 28)
      const b = createCalendarDate(2024, 3, 1)
      expect(diffInDays(a, b)).toBe(2) // 28 -> 29 -> 01
    })

    it("retorna valor negativo quando a segunda data é anterior", () => {
      const a = createCalendarDate(2026, 10, 8)
      const b = createCalendarDate(2026, 10, 7)
      expect(diffInDays(a, b)).toBe(-1)
    })
  })

  describe("addYears", () => {
    it("15/03/2025 + 1 ano = 15/03/2026", () => {
      const result = addYears(createCalendarDate(2025, 3, 15), 1)
      expect(result).toEqual({ year: 2026, month: 3, day: 15 })
    })

    it("29/02/2024 + 1 ano = 28/02/2025 (ano de destino não bissexto)", () => {
      const result = addYears(createCalendarDate(2024, 2, 29), 1)
      expect(result).toEqual({ year: 2025, month: 2, day: 28 })
    })

    it("29/02/2024 + 4 anos = 29/02/2028 (ano de destino bissexto)", () => {
      const result = addYears(createCalendarDate(2024, 2, 29), 4)
      expect(result).toEqual({ year: 2028, month: 2, day: 29 })
    })
  })

  describe("conversão YYYY-MM-DD", () => {
    it("converte string válida para CalendarDate", () => {
      expect(fromISODateString("2026-10-07")).toEqual({ year: 2026, month: 10, day: 7 })
    })

    it("rejeita formato com barras", () => {
      expect(() => fromISODateString("07/10/2026")).toThrow()
    })

    it("rejeita formato com horário", () => {
      expect(() => fromISODateString("2026-10-07T00:00:00Z")).toThrow()
    })

    it("rejeita string vazia", () => {
      expect(() => fromISODateString("")).toThrow()
    })

    it("rejeita data inexistente mesmo em formato correto (29/02 em ano não bissexto)", () => {
      expect(() => fromISODateString("2026-02-29")).toThrow()
    })

    it("preserva exatamente a data na ida e volta (round-trip)", () => {
      const original = "2024-02-29"
      const date = fromISODateString(original)
      expect(toISODateString(date)).toBe(original)
    })
  })

  describe("addDays atravessando vários anos (valida a conversão fechada de dia absoluto)", () => {
    it("addDays(2026-01-01, 1500) avança para a data correta", () => {
      const result = addDays(createCalendarDate(2026, 1, 1), 1500)
      // Valor conferido por simulação independente (soma dia a dia, sem
      // usar a fórmula fechada), ver verificação manual registrada no
      // AI-LOG.md.
      expect(result).toEqual({ year: 2030, month: 2, day: 9 })
    })

    it("addDays(2026-01-01, -1500) retrocede para a data correta", () => {
      const result = addDays(createCalendarDate(2026, 1, 1), -1500)
      // Valor conferido pela mesma simulação independente.
      expect(result).toEqual({ year: 2021, month: 11, day: 23 })
    })
  })

  describe("round-trip em datas distantes (ida e volta via addDays/diffInDays)", () => {
    const distantDates: Array<[number, number, number]> = [
      [1900, 1, 1],
      [1900, 2, 28],
      [1900, 3, 1],
      [2000, 2, 29],
      [2100, 2, 28],
      [2100, 3, 1],
    ]

    it.each(distantDates)(
      "%i-%i-%i permanece igual após addDays(0) (round-trip de toAbsoluteDays/fromAbsoluteDays)",
      (year, month, day) => {
        const original = createCalendarDate(year, month, day)
        const roundTripped = addDays(original, 0)
        expect(roundTripped).toEqual(original)
      },
    )
  })

  describe("datas bissextas atravessadas por addDays em datas distantes", () => {
    it("2000-02-28 + 1 dia = 2000-02-29 (2000 é bissexto: divisível por 400)", () => {
      const result = addDays(createCalendarDate(2000, 2, 28), 1)
      expect(result).toEqual({ year: 2000, month: 2, day: 29 })
    })

    it("2000-02-29 + 1 dia = 2000-03-01", () => {
      const result = addDays(createCalendarDate(2000, 2, 29), 1)
      expect(result).toEqual({ year: 2000, month: 3, day: 1 })
    })

    it("2100-02-28 + 1 dia = 2100-03-01 (2100 NÃO é bissexto: divisível por 100, não por 400)", () => {
      const result = addDays(createCalendarDate(2100, 2, 28), 1)
      expect(result).toEqual({ year: 2100, month: 3, day: 1 })
    })
  })

  describe("round-trip de deslocamento (addDays seguido de diffInDays)", () => {
    const offsets = [0, 1, -1, 30, -30, 365, -365, 1500, -1500, 36525, -36525]

    it.each(offsets)(
      "diffInDays(original, addDays(original, %i)) === %i, a partir de 2026-01-01",
      (n) => {
        const original = createCalendarDate(2026, 1, 1)
        const shifted = addDays(original, n)
        expect(diffInDays(original, shifted)).toBe(n)
      },
    )

    it.each(offsets)(
      "diffInDays(original, addDays(original, %i)) === %i, a partir de 1900-01-01",
      (n) => {
        const original = createCalendarDate(1900, 1, 1)
        const shifted = addDays(original, n)
        expect(diffInDays(original, shifted)).toBe(n)
      },
    )
  })

  describe("comparação e igualdade", () => {
    it("compareCalendarDates é negativo quando a < b", () => {
      const a = createCalendarDate(2026, 1, 1)
      const b = createCalendarDate(2026, 1, 2)
      expect(compareCalendarDates(a, b)).toBeLessThan(0)
    })

    it("compareCalendarDates é positivo quando a > b", () => {
      const a = createCalendarDate(2026, 1, 2)
      const b = createCalendarDate(2026, 1, 1)
      expect(compareCalendarDates(a, b)).toBeGreaterThan(0)
    })

    it("compareCalendarDates é 0 quando as datas são iguais", () => {
      const a = createCalendarDate(2026, 1, 1)
      const b = createCalendarDate(2026, 1, 1)
      expect(compareCalendarDates(a, b)).toBe(0)
    })

    it("isBefore, isAfter e isEqual são consistentes entre si", () => {
      const a = createCalendarDate(2026, 1, 1)
      const b = createCalendarDate(2026, 1, 2)

      expect(isBefore(a, b)).toBe(true)
      expect(isAfter(a, b)).toBe(false)
      expect(isEqual(a, b)).toBe(false)

      expect(isBefore(b, a)).toBe(false)
      expect(isAfter(b, a)).toBe(true)

      expect(isEqual(a, a)).toBe(true)
    })
  })
})
