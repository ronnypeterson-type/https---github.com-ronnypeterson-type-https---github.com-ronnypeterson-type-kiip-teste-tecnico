import { describe, expect, it } from "vitest"
import { createCalendarDate, addDays, diffInDays, isEqual } from "../../src/utils/calendar-date.js"
import {
  calcularPeriodoAquisitivo,
  DIAS_ADQUIRIDOS_POR_PERIODO,
} from "../../src/domain/periodo-aquisitivo.js"

describe("R1 — calcularPeriodoAquisitivo", () => {
  describe("admissão em 15/03/2025 (data comum, sem caso de borda)", () => {
    const admissao = createCalendarDate(2025, 3, 15)

    it("período 1: 15/03/2025 até 14/03/2026", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 1)
      expect(periodo.dataInicio).toEqual({ year: 2025, month: 3, day: 15 })
      expect(periodo.dataFim).toEqual({ year: 2026, month: 3, day: 14 })
    })

    it("período 2: 15/03/2026 até 14/03/2027", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 2)
      expect(periodo.dataInicio).toEqual({ year: 2026, month: 3, day: 15 })
      expect(periodo.dataFim).toEqual({ year: 2027, month: 3, day: 14 })
    })

    it("período 3: 15/03/2027 até 14/03/2028", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 3)
      expect(periodo.dataInicio).toEqual({ year: 2027, month: 3, day: 15 })
      expect(periodo.dataFim).toEqual({ year: 2028, month: 3, day: 14 })
    })
  })

  describe("admissão em 29/02/2024 (caso especial: ano bissexto)", () => {
    const admissao = createCalendarDate(2024, 2, 29)

    it("período 1: 29/02/2024 até 27/02/2025", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 1)
      expect(periodo.dataInicio).toEqual({ year: 2024, month: 2, day: 29 })
      expect(periodo.dataFim).toEqual({ year: 2025, month: 2, day: 27 })
    })

    it("período 2: 28/02/2025 até 27/02/2026", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 2)
      expect(periodo.dataInicio).toEqual({ year: 2025, month: 2, day: 28 })
      expect(periodo.dataFim).toEqual({ year: 2026, month: 2, day: 27 })
    })

    it("período 3: 28/02/2026 até 27/02/2027", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 3)
      expect(periodo.dataInicio).toEqual({ year: 2026, month: 2, day: 28 })
      expect(periodo.dataFim).toEqual({ year: 2027, month: 2, day: 27 })
    })

    it("período 4: 28/02/2027 até 28/02/2028", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 4)
      expect(periodo.dataInicio).toEqual({ year: 2027, month: 2, day: 28 })
      expect(periodo.dataFim).toEqual({ year: 2028, month: 2, day: 28 })
    })

    it("período 5: 29/02/2028 até 27/02/2029 (início do período 6 é 28/02/2029, pois 2029 não é bissexto)", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 5)
      expect(periodo.dataInicio).toEqual({ year: 2028, month: 2, day: 29 })
      expect(periodo.dataFim).toEqual({ year: 2029, month: 2, day: 27 })
    })
  })

  describe("admissão em data comum no final do mês (aniversário normal preservado)", () => {
    // 31/01 é usado para garantir que, quando o aniversário É válido no mês
    // de destino (janeiro sempre tem 31 dias, em qualquer ano), o dia
    // original é preservado exatamente — sem a regra de ajuste do R1.
    const admissao = createCalendarDate(2023, 1, 31)

    it("período 1: 31/01/2023 até 30/01/2024 (início do período 2 é 31/01/2024; o dia anterior é 30/01/2024)", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 1)
      expect(periodo.dataInicio).toEqual({ year: 2023, month: 1, day: 31 })
      expect(periodo.dataFim).toEqual({ year: 2024, month: 1, day: 30 })
    })

    it("período 2: 31/01/2024 até 30/01/2025", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 2)
      expect(periodo.dataInicio).toEqual({ year: 2024, month: 1, day: 31 })
      expect(periodo.dataFim).toEqual({ year: 2025, month: 1, day: 30 })
    })
  })

  describe("admissão em data comum dentro de fevereiro (dia 10, não é caso de borda 29/02)", () => {
    const admissao = createCalendarDate(2023, 2, 10)

    it("período 1: 10/02/2023 até 09/02/2024 (aniversário normal preservado mesmo atravessando fevereiro)", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 1)
      expect(periodo.dataInicio).toEqual({ year: 2023, month: 2, day: 10 })
      expect(periodo.dataFim).toEqual({ year: 2024, month: 2, day: 9 })
    })
  })

  describe("admissão em 31/08 (mês com 31 dias seguido de mês com 30 dias — não envolve fevereiro)", () => {
    const admissao = createCalendarDate(2022, 8, 31)

    it("período 1 preserva o dia 31, pois agosto sempre tem 31 dias (início do período 2 é 31/08/2023; o dia anterior é 30/08/2023)", () => {
      const periodo = calcularPeriodoAquisitivo(admissao, 1)
      expect(periodo.dataInicio).toEqual({ year: 2022, month: 8, day: 31 })
      expect(periodo.dataFim).toEqual({ year: 2023, month: 8, day: 30 })
    })
  })

  describe("validação de periodoNumero", () => {
    const admissao = createCalendarDate(2025, 3, 15)

    it("rejeita período 0", () => {
      expect(() => calcularPeriodoAquisitivo(admissao, 0)).toThrow()
    })

    it("rejeita período -1", () => {
      expect(() => calcularPeriodoAquisitivo(admissao, -1)).toThrow()
    })

    it("rejeita período 1.5 (não inteiro)", () => {
      expect(() => calcularPeriodoAquisitivo(admissao, 1.5)).toThrow()
    })
  })

  describe("invariantes genéricas (válidas para qualquer admissão/período)", () => {
    // Conjunto de datas de admissão variadas, incluindo casos de borda e
    // datas comuns, para demonstrar que a lógica é genérica — não uma
    // implementação específica para os exemplos do enunciado.
    const admissoes = [
      createCalendarDate(2025, 3, 15),
      createCalendarDate(2024, 2, 29),
      createCalendarDate(2023, 1, 31),
      createCalendarDate(2022, 8, 31),
      createCalendarDate(2020, 6, 10),
      createCalendarDate(2019, 12, 1),
    ]

    it("todo período retorna exatamente 30 dias adquiridos", () => {
      for (const admissao of admissoes) {
        for (let n = 1; n <= 6; n++) {
          const periodo = calcularPeriodoAquisitivo(admissao, n)
          expect(periodo.diasAdquiridos).toBe(DIAS_ADQUIRIDOS_POR_PERIODO)
        }
      }
    })

    it("dataFim do período N é sempre (início do período N+1) - 1 dia", () => {
      for (const admissao of admissoes) {
        for (let n = 1; n <= 6; n++) {
          const periodoAtual = calcularPeriodoAquisitivo(admissao, n)
          const periodoSeguinte = calcularPeriodoAquisitivo(admissao, n + 1)

          const fimEsperado = addDays(periodoSeguinte.dataInicio, -1)
          expect(isEqual(periodoAtual.dataFim, fimEsperado)).toBe(true)
        }
      }
    })

    it("períodos consecutivos não possuem lacunas nem sobreposição (fim de N + 1 dia = início de N+1)", () => {
      for (const admissao of admissoes) {
        for (let n = 1; n <= 6; n++) {
          const periodoAtual = calcularPeriodoAquisitivo(admissao, n)
          const periodoSeguinte = calcularPeriodoAquisitivo(admissao, n + 1)

          // Nenhuma lacuna: o dia seguinte ao fim do período N é exatamente
          // o início do período N+1.
          const diaSeguinteAoFim = addDays(periodoAtual.dataFim, 1)
          expect(isEqual(diaSeguinteAoFim, periodoSeguinte.dataInicio)).toBe(true)

          // Nenhuma sobreposição: a diferença entre o fim do período N e o
          // início do período N+1 é negativa (fim estritamente antes do
          // próximo início).
          expect(diffInDays(periodoAtual.dataFim, periodoSeguinte.dataInicio)).toBeGreaterThan(0)
        }
      }
    })

    it("o período 1 sempre começa exatamente na data de admissão", () => {
      for (const admissao of admissoes) {
        const periodo1 = calcularPeriodoAquisitivo(admissao, 1)
        expect(isEqual(periodo1.dataInicio, admissao)).toBe(true)
      }
    })

    it("o número do período retornado corresponde ao solicitado", () => {
      for (const admissao of admissoes) {
        for (let n = 1; n <= 6; n++) {
          const periodo = calcularPeriodoAquisitivo(admissao, n)
          expect(periodo.periodoNumero).toBe(n)
        }
      }
    })
  })
})
