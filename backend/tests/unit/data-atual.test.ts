import { describe, expect, it } from "vitest"
import { addDays, createCalendarDate } from "../../src/utils/calendar-date.js"
import {
  ehDataFutura,
  validarAgendamentoFuturo,
  validarCancelamentoFuturo,
} from "../../src/domain/data-atual.js"
import { RegraNegocioError } from "../../src/domain/regra-negocio-error.js"

// "Hoje" é sempre passado explicitamente nos testes abaixo — nunca
// calculado a partir do relógio do sistema — garantindo determinismo
// independente do dia em que a suíte é executada.
const HOJE = createCalendarDate(2026, 6, 15)
const ONTEM = addDays(HOJE, -1)
const AMANHA = addDays(HOJE, 1)
const DISTANTE_NO_FUTURO = addDays(HOJE, 60)

describe("R6 — ehDataFutura", () => {
  it("ontem não é data futura", () => {
    expect(ehDataFutura(ONTEM, HOJE)).toBe(false)
  })

  it("hoje não é data futura (comparação estrita)", () => {
    expect(ehDataFutura(HOJE, HOJE)).toBe(false)
  })

  it("amanhã é data futura", () => {
    expect(ehDataFutura(AMANHA, HOJE)).toBe(true)
  })

  it("vários dias no futuro é data futura", () => {
    expect(ehDataFutura(DISTANTE_NO_FUTURO, HOJE)).toBe(true)
  })
})

describe("R6 — validarAgendamentoFuturo", () => {
  it("lança R6 quando dataInicio é ontem", () => {
    expect(() => validarAgendamentoFuturo(ONTEM, HOJE)).toThrow()
  })

  it("lança R6 quando dataInicio é hoje", () => {
    expect(() => validarAgendamentoFuturo(HOJE, HOJE)).toThrow()
  })

  it("não lança quando dataInicio é amanhã", () => {
    expect(() => validarAgendamentoFuturo(AMANHA, HOJE)).not.toThrow()
  })

  it("não lança quando dataInicio é uma data distante no futuro", () => {
    expect(() => validarAgendamentoFuturo(DISTANTE_NO_FUTURO, HOJE)).not.toThrow()
  })

  it("a mensagem do erro orienta a escolher uma data futura", () => {
    try {
      validarAgendamentoFuturo(HOJE, HOJE)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect((error as RegraNegocioError).message).toBe(
        "As férias só podem ser agendadas para uma data de início posterior a hoje. Escolha uma data futura.",
      )
    }
  })

  it("lança com código R6", () => {
    try {
      validarAgendamentoFuturo(ONTEM, HOJE)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R6")
    }
  })
})

describe("R6 — validarCancelamentoFuturo", () => {
  it("lança R6 quando dataInicio é ontem", () => {
    expect(() => validarCancelamentoFuturo(ONTEM, HOJE)).toThrow()
  })

  it("lança R6 quando dataInicio é hoje", () => {
    expect(() => validarCancelamentoFuturo(HOJE, HOJE)).toThrow()
  })

  it("não lança quando dataInicio é amanhã", () => {
    expect(() => validarCancelamentoFuturo(AMANHA, HOJE)).not.toThrow()
  })

  it("não lança quando dataInicio é uma data distante no futuro", () => {
    expect(() => validarCancelamentoFuturo(DISTANTE_NO_FUTURO, HOJE)).not.toThrow()
  })

  it("a mensagem do erro explica que o início já ocorreu ou é hoje", () => {
    try {
      validarCancelamentoFuturo(HOJE, HOJE)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect((error as RegraNegocioError).message).toBe(
        "Não é possível cancelar um período de férias cujo início já ocorreu ou é hoje.",
      )
    }
  })

  it("lança com código R6", () => {
    try {
      validarCancelamentoFuturo(ONTEM, HOJE)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R6")
    }
  })
})

describe("R6 — travessia de mês e de ano (comparação puramente calendárica)", () => {
  it("28/02/2026 (hoje) considera 01/03/2026 (amanhã) como data futura, atravessando o mês", () => {
    const hoje = createCalendarDate(2026, 2, 28)
    const amanha = createCalendarDate(2026, 3, 1)
    expect(ehDataFutura(amanha, hoje)).toBe(true)
  })

  it("31/12/2026 (hoje) considera 01/01/2027 (amanhã) como data futura, atravessando o ano", () => {
    const hoje = createCalendarDate(2026, 12, 31)
    const amanha = createCalendarDate(2027, 1, 1)
    expect(ehDataFutura(amanha, hoje)).toBe(true)
  })

  it("01/01/2027 (hoje) NÃO considera 31/12/2026 (ontem, do ano anterior) como data futura", () => {
    const hoje = createCalendarDate(2027, 1, 1)
    const ontem = createCalendarDate(2026, 12, 31)
    expect(ehDataFutura(ontem, hoje)).toBe(false)
  })

  it("validarAgendamentoFuturo aceita início no dia seguinte à virada de ano", () => {
    const hoje = createCalendarDate(2026, 12, 31)
    const amanha = createCalendarDate(2027, 1, 1)
    expect(() => validarAgendamentoFuturo(amanha, hoje)).not.toThrow()
  })
})
