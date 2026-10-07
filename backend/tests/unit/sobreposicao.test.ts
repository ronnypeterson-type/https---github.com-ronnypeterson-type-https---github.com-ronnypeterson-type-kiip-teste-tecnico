import { describe, expect, it } from "vitest"
import { createCalendarDate } from "../../src/utils/calendar-date.js"
import {
  calcularDataFim,
  existeConflito,
  seSobrepoem,
  validarSemSobreposicao,
  type IntervaloFerias,
} from "../../src/domain/sobreposicao.js"
import { RegraNegocioError } from "../../src/domain/regra-negocio-error.js"

function intervalo(
  anoInicio: number,
  mesInicio: number,
  diaInicio: number,
  anoFim: number,
  mesFim: number,
  diaFim: number,
): IntervaloFerias {
  return {
    dataInicio: createCalendarDate(anoInicio, mesInicio, diaInicio),
    dataFim: createCalendarDate(anoFim, mesFim, diaFim),
  }
}

describe("R5 — calcularDataFim", () => {
  it("1 dia: início = fim", () => {
    const fim = calcularDataFim(createCalendarDate(2026, 3, 15), 1)
    expect(fim).toEqual({ year: 2026, month: 3, day: 15 })
  })

  it("5 dias: fim = início + 4", () => {
    const fim = calcularDataFim(createCalendarDate(2026, 3, 15), 5)
    expect(fim).toEqual({ year: 2026, month: 3, day: 19 })
  })

  it("intervalo atravessando mês (10 dias a partir de 25/01/2026)", () => {
    const fim = calcularDataFim(createCalendarDate(2026, 1, 25), 10)
    expect(fim).toEqual({ year: 2026, month: 2, day: 3 })
  })

  it("intervalo atravessando ano (10 dias a partir de 28/12/2026)", () => {
    const fim = calcularDataFim(createCalendarDate(2026, 12, 28), 10)
    expect(fim).toEqual({ year: 2027, month: 1, day: 6 })
  })

  it("rejeita quantidadeDias menor que 1", () => {
    expect(() => calcularDataFim(createCalendarDate(2026, 1, 1), 0)).toThrow()
  })

  it("rejeita quantidadeDias não inteiro", () => {
    expect(() => calcularDataFim(createCalendarDate(2026, 1, 1), 1.5)).toThrow()
  })
})

describe("R5 — seSobrepoem", () => {
  it("dois intervalos totalmente separados não se sobrepõem", () => {
    const a = intervalo(2026, 1, 1, 2026, 1, 10)
    const b = intervalo(2026, 1, 20, 2026, 1, 25)
    expect(seSobrepoem(a, b)).toBe(false)
  })

  it("intervalo começando exatamente no dia seguinte ao fim do anterior NÃO se sobrepõe", () => {
    const a = intervalo(2026, 1, 1, 2026, 1, 10)
    const b = intervalo(2026, 1, 11, 2026, 1, 15)
    expect(seSobrepoem(a, b)).toBe(false)
  })

  it("intervalo começando exatamente no mesmo dia do fim do anterior SE sobrepõe (data inclusiva)", () => {
    const a = intervalo(2026, 1, 1, 2026, 1, 10)
    const b = intervalo(2026, 1, 10, 2026, 1, 15)
    expect(seSobrepoem(a, b)).toBe(true)
  })

  it("mesmo início se sobrepõe", () => {
    const a = intervalo(2026, 1, 1, 2026, 1, 10)
    const b = intervalo(2026, 1, 1, 2026, 1, 5)
    expect(seSobrepoem(a, b)).toBe(true)
  })

  it("intervalo contido dentro de outro se sobrepõe", () => {
    const a = intervalo(2026, 1, 1, 2026, 1, 20)
    const b = intervalo(2026, 1, 5, 2026, 1, 10)
    expect(seSobrepoem(a, b)).toBe(true)
  })

  it("intervalo contendo outro se sobrepõe (caso inverso/simétrico)", () => {
    const a = intervalo(2026, 1, 5, 2026, 1, 10)
    const b = intervalo(2026, 1, 1, 2026, 1, 20)
    expect(seSobrepoem(a, b)).toBe(true)
  })

  it("sobreposição de apenas 1 dia se sobrepõe", () => {
    const a = intervalo(2026, 1, 1, 2026, 1, 10)
    const b = intervalo(2026, 1, 10, 2026, 1, 20)
    expect(seSobrepoem(a, b)).toBe(true)
  })

  it("intervalos atravessando a fronteira de mês são comparados corretamente", () => {
    const a = intervalo(2026, 1, 25, 2026, 2, 3) // atravessa jan->fev
    const b = intervalo(2026, 2, 1, 2026, 2, 5) // começa dentro do intervalo de A
    expect(seSobrepoem(a, b)).toBe(true)

    const c = intervalo(2026, 2, 4, 2026, 2, 10) // começa 1 dia depois do fim de A
    expect(seSobrepoem(a, c)).toBe(false)
  })

  it("intervalos atravessando a fronteira de ano são comparados corretamente", () => {
    const a = intervalo(2026, 12, 28, 2027, 1, 6) // atravessa 2026->2027
    const b = intervalo(2027, 1, 1, 2027, 1, 3) // começa dentro do intervalo de A
    expect(seSobrepoem(a, b)).toBe(true)

    const c = intervalo(2027, 1, 7, 2027, 1, 10) // começa 1 dia depois do fim de A
    expect(seSobrepoem(a, c)).toBe(false)
  })

  it("a função é simétrica: seSobrepoem(A, B) === seSobrepoem(B, A)", () => {
    const casos: [IntervaloFerias, IntervaloFerias][] = [
      [intervalo(2026, 1, 1, 2026, 1, 10), intervalo(2026, 1, 20, 2026, 1, 25)],
      [intervalo(2026, 1, 1, 2026, 1, 10), intervalo(2026, 1, 10, 2026, 1, 15)],
      [intervalo(2026, 1, 1, 2026, 1, 20), intervalo(2026, 1, 5, 2026, 1, 10)],
      [intervalo(2026, 12, 28, 2027, 1, 6), intervalo(2027, 1, 1, 2027, 1, 3)],
    ]

    for (const [a, b] of casos) {
      expect(seSobrepoem(a, b)).toBe(seSobrepoem(b, a))
    }
  })
})

describe("R5 — existeConflito (lista de intervalos existentes)", () => {
  it("nenhum conflito com vários intervalos existentes", () => {
    const existentes = [
      intervalo(2026, 1, 1, 2026, 1, 10),
      intervalo(2026, 3, 1, 2026, 3, 10),
      intervalo(2026, 6, 1, 2026, 6, 10),
    ]
    const novo = intervalo(2026, 2, 1, 2026, 2, 10)
    expect(existeConflito(existentes, novo)).toBe(false)
  })

  it("conflito com apenas um dos intervalos existentes", () => {
    const existentes = [
      intervalo(2026, 1, 1, 2026, 1, 10),
      intervalo(2026, 3, 1, 2026, 3, 10),
      intervalo(2026, 6, 1, 2026, 6, 10),
    ]
    const novo = intervalo(2026, 3, 5, 2026, 3, 15) // sobrepõe só o segundo
    expect(existeConflito(existentes, novo)).toBe(true)
  })

  it("lista vazia nunca gera conflito", () => {
    const novo = intervalo(2026, 1, 1, 2026, 1, 10)
    expect(existeConflito([], novo)).toBe(false)
  })

  it("intervalos de períodos aquisitivos diferentes são comparados igualmente (a função não recebe periodoNumero, apenas datas)", () => {
    // A função opera somente sobre datas — não há conceito de
    // periodoNumero nesta camada. Isso demonstra que, mesmo representando
    // conceitualmente agendamentos de aquisitivos diferentes, a
    // comparação de datas continua detectando o conflito normalmente.
    const periodoAquisitivo1 = intervalo(2026, 1, 1, 2026, 1, 10)
    const periodoAquisitivo2 = intervalo(2026, 1, 5, 2026, 1, 15)
    expect(seSobrepoem(periodoAquisitivo1, periodoAquisitivo2)).toBe(true)
    expect(existeConflito([periodoAquisitivo1], periodoAquisitivo2)).toBe(true)
  })
})

describe("R5 — validarSemSobreposicao (lança RegraNegocioError com código R5)", () => {
  it("não lança quando não há conflito", () => {
    const existentes = [intervalo(2026, 1, 1, 2026, 1, 10)]
    const novo = intervalo(2026, 2, 1, 2026, 2, 10)
    expect(() => validarSemSobreposicao(existentes, novo)).not.toThrow()
  })

  it("lança RegraNegocioError com código R5 quando há conflito", () => {
    const existentes = [intervalo(2026, 1, 1, 2026, 1, 10)]
    const novo = intervalo(2026, 1, 5, 2026, 1, 15)

    try {
      validarSemSobreposicao(existentes, novo)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R5")
    }
  })

  it("mensagem de erro não expõe detalhes técnicos", () => {
    const existentes = [intervalo(2026, 1, 1, 2026, 1, 10)]
    const novo = intervalo(2026, 1, 5, 2026, 1, 15)

    try {
      validarSemSobreposicao(existentes, novo)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      const mensagem = (error as RegraNegocioError).message
      expect(mensagem).not.toMatch(/SELECT|INSERT|prisma|undefined|null|stack/i)
    }
  })

  it("a função pura não filtra por status — um intervalo 'cancelado' hipotético ainda seria considerado se estiver na lista recebida", () => {
    // Esta função não tem conceito de status: ela compara exatamente a
    // lista que recebe. A responsabilidade de excluir agendamentos
    // cancelados é da futura camada de integração, não desta função.
    // Este teste documenta esse contrato: passar a lista completa
    // (incluindo o que seria um "cancelado") ainda gera conflito.
    const existentes = [intervalo(2026, 1, 1, 2026, 1, 10)] // representaria um cancelado, se filtrado pela integração
    const novo = intervalo(2026, 1, 5, 2026, 1, 15)
    expect(existeConflito(existentes, novo)).toBe(true)
  })
})
