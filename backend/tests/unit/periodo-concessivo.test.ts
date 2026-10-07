import { describe, expect, it } from "vitest"
import { addDays, createCalendarDate, diffInDays, isEqual } from "../../src/utils/calendar-date.js"
import { calcularPeriodoAquisitivo } from "../../src/domain/periodo-aquisitivo.js"
import {
  calcularPeriodoConcessivo,
  estaDentroDoConcessivo,
  type PeriodoConcessivo,
} from "../../src/domain/periodo-concessivo.js"

describe("R2 — calcularPeriodoConcessivo", () => {
  describe("admissão em 15/03/2025 (caso normal do enunciado)", () => {
    const admissao = createCalendarDate(2025, 3, 15)

    it("concessivo do aquisitivo 1: 15/03/2026 até 14/03/2027", () => {
      const concessivo = calcularPeriodoConcessivo(admissao, 1)
      expect(concessivo.dataInicio).toEqual({ year: 2026, month: 3, day: 15 })
      expect(concessivo.dataFim).toEqual({ year: 2027, month: 3, day: 14 })
    })

    it("concessivo do aquisitivo 2: 15/03/2027 até 14/03/2028", () => {
      const concessivo = calcularPeriodoConcessivo(admissao, 2)
      expect(concessivo.dataInicio).toEqual({ year: 2027, month: 3, day: 15 })
      expect(concessivo.dataFim).toEqual({ year: 2028, month: 3, day: 14 })
    })
  })

  describe("admissão em 29/02/2024 (casos de borda envolvendo 28/02 e 29/02)", () => {
    const admissao = createCalendarDate(2024, 2, 29)

    it("concessivo do aquisitivo 1: 28/02/2025 até 27/02/2026", () => {
      const concessivo = calcularPeriodoConcessivo(admissao, 1)
      expect(concessivo.dataInicio).toEqual({ year: 2025, month: 2, day: 28 })
      expect(concessivo.dataFim).toEqual({ year: 2026, month: 2, day: 27 })
    })

    it("concessivo do aquisitivo 2: 28/02/2026 até 27/02/2027", () => {
      const concessivo = calcularPeriodoConcessivo(admissao, 2)
      expect(concessivo.dataInicio).toEqual({ year: 2026, month: 2, day: 28 })
      expect(concessivo.dataFim).toEqual({ year: 2027, month: 2, day: 27 })
    })

    it("concessivo do aquisitivo 3: 28/02/2027 até 28/02/2028 (fim atravessa para o ano bissexto)", () => {
      const concessivo = calcularPeriodoConcessivo(admissao, 3)
      expect(concessivo.dataInicio).toEqual({ year: 2027, month: 2, day: 28 })
      expect(concessivo.dataFim).toEqual({ year: 2028, month: 2, day: 28 })
    })

    it("concessivo do aquisitivo 4: 29/02/2028 até 27/02/2029 (início no dia 29, pois 2028 é bissexto)", () => {
      const concessivo = calcularPeriodoConcessivo(admissao, 4)
      expect(concessivo.dataInicio).toEqual({ year: 2028, month: 2, day: 29 })
      expect(concessivo.dataFim).toEqual({ year: 2029, month: 2, day: 27 })
    })

    it("concessivo do aquisitivo 5: 28/02/2029 até 27/02/2030", () => {
      const concessivo = calcularPeriodoConcessivo(admissao, 5)
      expect(concessivo.dataInicio).toEqual({ year: 2029, month: 2, day: 28 })
      expect(concessivo.dataFim).toEqual({ year: 2030, month: 2, day: 27 })
    })
  })

  describe("o concessivo do aquisitivo N é exatamente o aquisitivo N+1 (evita cálculo duplicado)", () => {
    const admissoes = [
      createCalendarDate(2025, 3, 15),
      createCalendarDate(2024, 2, 29),
      createCalendarDate(2023, 1, 31),
      createCalendarDate(2020, 6, 10),
    ]

    it("dataInicio e dataFim do concessivo coincidem com o aquisitivo seguinte, para qualquer admissão/período", () => {
      for (const admissao of admissoes) {
        for (let n = 1; n <= 5; n++) {
          const concessivo = calcularPeriodoConcessivo(admissao, n)
          const aquisitivoSeguinte = calcularPeriodoAquisitivo(admissao, n + 1)

          expect(isEqual(concessivo.dataInicio, aquisitivoSeguinte.dataInicio)).toBe(true)
          expect(isEqual(concessivo.dataFim, aquisitivoSeguinte.dataFim)).toBe(true)
        }
      }
    })
  })

  describe("não há lacuna nem sobreposição entre o aquisitivo e seu concessivo", () => {
    const admissoes = [
      createCalendarDate(2025, 3, 15),
      createCalendarDate(2024, 2, 29),
      createCalendarDate(2023, 1, 31),
    ]

    it("o concessivo começa exatamente no dia seguinte ao fim do próprio aquisitivo", () => {
      for (const admissao of admissoes) {
        for (let n = 1; n <= 5; n++) {
          const aquisitivo = calcularPeriodoAquisitivo(admissao, n)
          const concessivo = calcularPeriodoConcessivo(admissao, n)

          const diaSeguinteAoFimDoAquisitivo = addDays(aquisitivo.dataFim, 1)
          expect(isEqual(diaSeguinteAoFimDoAquisitivo, concessivo.dataInicio)).toBe(true)

          // Sem sobreposição: o fim do aquisitivo é estritamente anterior
          // ao início do seu próprio concessivo.
          expect(diffInDays(aquisitivo.dataFim, concessivo.dataInicio)).toBeGreaterThan(0)
        }
      }
    })
  })
})

describe("R2 — estaDentroDoConcessivo", () => {
  // Concessivo fixo usado como referência em todos os casos de validação
  // de intervalo: 15/03/2026 até 14/03/2027 (aquisitivo 1 da admissão
  // 15/03/2025, confirmado no bloco de testes acima).
  const concessivo: PeriodoConcessivo = {
    periodoNumero: 1,
    dataInicio: createCalendarDate(2026, 3, 15),
    dataFim: createCalendarDate(2027, 3, 14),
  }

  it("intervalo exatamente igual ao concessivo → aceita", () => {
    const resultado = estaDentroDoConcessivo(concessivo.dataInicio, concessivo.dataFim, concessivo)
    expect(resultado).toBe(true)
  })

  it("intervalo começando exatamente no primeiro dia do concessivo → aceita", () => {
    const inicio = concessivo.dataInicio
    const fim = addDays(concessivo.dataInicio, 5)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(true)
  })

  it("intervalo terminando exatamente no último dia do concessivo → aceita", () => {
    const inicio = addDays(concessivo.dataFim, -5)
    const fim = concessivo.dataFim
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(true)
  })

  it("início um dia antes do concessivo → rejeita", () => {
    const inicio = addDays(concessivo.dataInicio, -1)
    const fim = addDays(concessivo.dataInicio, 5)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(false)
  })

  it("fim um dia depois do concessivo → rejeita", () => {
    const inicio = addDays(concessivo.dataFim, -5)
    const fim = addDays(concessivo.dataFim, 1)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(false)
  })

  it("intervalo totalmente antes do concessivo → rejeita", () => {
    const inicio = addDays(concessivo.dataInicio, -30)
    const fim = addDays(concessivo.dataInicio, -10)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(false)
  })

  it("intervalo totalmente depois do concessivo → rejeita", () => {
    const inicio = addDays(concessivo.dataFim, 10)
    const fim = addDays(concessivo.dataFim, 30)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(false)
  })

  it("intervalo atravessando a fronteira inicial (começa antes, termina dentro) → rejeita", () => {
    const inicio = addDays(concessivo.dataInicio, -3)
    const fim = addDays(concessivo.dataInicio, 3)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(false)
  })

  it("intervalo atravessando a fronteira final (começa dentro, termina depois) → rejeita", () => {
    const inicio = addDays(concessivo.dataFim, -3)
    const fim = addDays(concessivo.dataFim, 3)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(false)
  })

  it("intervalo totalmente dentro do concessivo, sem tocar as fronteiras → aceita", () => {
    const inicio = addDays(concessivo.dataInicio, 10)
    const fim = addDays(concessivo.dataInicio, 20)
    expect(estaDentroDoConcessivo(inicio, fim, concessivo)).toBe(true)
  })

  it("intervalo com início e fim no mesmo dia, dentro do concessivo → aceita", () => {
    const dia = addDays(concessivo.dataInicio, 10)
    expect(estaDentroDoConcessivo(dia, dia, concessivo)).toBe(true)
  })
})
