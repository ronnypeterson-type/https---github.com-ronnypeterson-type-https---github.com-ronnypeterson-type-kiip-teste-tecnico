import { describe, expect, it } from "vitest"
import {
  derivarEstadoFracionamento,
  ehCompletavel,
  podeAceitarNovoPeriodo,
  validarNovoPeriodo,
  type EstadoFracionamento,
} from "../../src/domain/fracionamento.js"
import { RegraNegocioError } from "../../src/domain/regra-negocio-error.js"

function estado(
  quantidadePeriodosExistentes: number,
  diasConsumidos: number,
  existePeriodoGrande: boolean,
): EstadoFracionamento {
  return { quantidadePeriodosExistentes, diasConsumidos, existePeriodoGrande }
}

describe("R3 — exemplos oficiais do enunciado", () => {
  it("14 depois 16 → aceita os dois", () => {
    const e0 = estado(0, 0, false)
    expect(podeAceitarNovoPeriodo(e0, 14)).toBe(true)

    const e1 = derivarEstadoFracionamento([14])
    expect(podeAceitarNovoPeriodo(e1, 16)).toBe(true)
  })

  it("5 depois 25 → aceita os dois", () => {
    const e0 = estado(0, 0, false)
    expect(podeAceitarNovoPeriodo(e0, 5)).toBe(true)

    const e1 = derivarEstadoFracionamento([5])
    expect(podeAceitarNovoPeriodo(e1, 25)).toBe(true)
  })

  it("14, 6, depois 10 → aceita os três", () => {
    const e0 = estado(0, 0, false)
    expect(podeAceitarNovoPeriodo(e0, 14)).toBe(true)

    const e1 = derivarEstadoFracionamento([14])
    expect(podeAceitarNovoPeriodo(e1, 6)).toBe(true)

    const e2 = derivarEstadoFracionamento([14, 6])
    expect(podeAceitarNovoPeriodo(e2, 10)).toBe(true)
  })

  it("10 depois 10 → rejeita o segundo (sobram 10 dias e um período, nenhum atinge 14)", () => {
    const e0 = estado(0, 0, false)
    expect(podeAceitarNovoPeriodo(e0, 10)).toBe(true)

    const e1 = derivarEstadoFracionamento([10])
    expect(podeAceitarNovoPeriodo(e1, 10)).toBe(false)
  })

  it("26 → rejeita (sobram 4 dias, menos que 5)", () => {
    const e0 = estado(0, 0, false)
    expect(podeAceitarNovoPeriodo(e0, 26)).toBe(false)
  })

  it("14, 6, depois 6 → rejeita o terceiro (sobrariam 4 dias e nenhum período)", () => {
    const e0 = estado(0, 0, false)
    expect(podeAceitarNovoPeriodo(e0, 14)).toBe(true)

    const e1 = derivarEstadoFracionamento([14])
    expect(podeAceitarNovoPeriodo(e1, 6)).toBe(true)

    const e2 = derivarEstadoFracionamento([14, 6])
    expect(podeAceitarNovoPeriodo(e2, 6)).toBe(false)
  })
})

describe("R3 — ehCompletavel (fórmula fechada de completabilidade)", () => {
  describe("quando a cota de >=14 já foi satisfeita (existePeriodoGrande = true)", () => {
    it("saldo 0 → completável", () => {
      expect(ehCompletavel(0, 2, true)).toBe(true)
      expect(ehCompletavel(0, 1, true)).toBe(true)
      expect(ehCompletavel(0, 0, true)).toBe(true)
    })

    it("saldo 5 → completável (fronteira exata)", () => {
      expect(ehCompletavel(5, 1, true)).toBe(true)
    })

    it("saldo 4 → não completável (fronteira exata)", () => {
      expect(ehCompletavel(4, 1, true)).toBe(false)
    })

    it("saldo entre 1 e 3 → não completável", () => {
      expect(ehCompletavel(1, 2, true)).toBe(false)
      expect(ehCompletavel(2, 2, true)).toBe(false)
      expect(ehCompletavel(3, 2, true)).toBe(false)
    })

    it("saldo >= 5 → completável independentemente de periodosFuturos (até com 0 períodos futuros)", () => {
      expect(ehCompletavel(5, 0, true)).toBe(true)
      expect(ehCompletavel(10, 0, true)).toBe(true)
      expect(ehCompletavel(16, 2, true)).toBe(true)
    })
  })

  describe("quando a cota de >=14 ainda está pendente (existePeriodoGrande = false)", () => {
    it("saldo 14 com período futuro disponível → completável (fronteira exata)", () => {
      expect(ehCompletavel(14, 1, false)).toBe(true)
      expect(ehCompletavel(14, 2, false)).toBe(true)
    })

    it("saldo 13 → não completável, mesmo com períodos futuros (fronteira exata)", () => {
      expect(ehCompletavel(13, 1, false)).toBe(false)
      expect(ehCompletavel(13, 2, false)).toBe(false)
    })

    it("saldo 0 sem período >=14 → não completável (a cota nunca foi satisfeita)", () => {
      expect(ehCompletavel(0, 0, false)).toBe(false)
      expect(ehCompletavel(0, 1, false)).toBe(false)
    })

    it("saldo >=14 mas sem período futuro disponível (periodosFuturos = 0) → não completável", () => {
      expect(ehCompletavel(14, 0, false)).toBe(false)
      expect(ehCompletavel(20, 0, false)).toBe(false)
    })

    it("saldo positivo menor que 14 → nunca completável, com 1 ou 2 períodos futuros", () => {
      expect(ehCompletavel(5, 1, false)).toBe(false)
      expect(ehCompletavel(5, 2, false)).toBe(false)
      expect(ehCompletavel(10, 1, false)).toBe(false)
      expect(ehCompletavel(10, 2, false)).toBe(false)
    })
  })
})

describe("R3 — podeAceitarNovoPeriodo: validações estruturais", () => {
  it("rejeita X < 5 (período de 4 dias)", () => {
    expect(podeAceitarNovoPeriodo(estado(0, 0, false), 4)).toBe(false)
  })

  it("rejeita X = 0", () => {
    expect(podeAceitarNovoPeriodo(estado(0, 0, false), 0)).toBe(false)
  })

  it("aceita X = 5 (mínimo exato)", () => {
    expect(podeAceitarNovoPeriodo(estado(0, 0, false), 5)).toBe(true)
  })

  it("rejeita tentativa de quarto período, mesmo que o tamanho seja válido", () => {
    const tresPeriodos = estado(3, 30, true)
    expect(podeAceitarNovoPeriodo(tresPeriodos, 5)).toBe(false)
  })

  it("rejeita quando o novo consumido excede 30 dias (X > saldo disponível)", () => {
    const comDezDias = estado(1, 10, false)
    expect(podeAceitarNovoPeriodo(comDezDias, 25)).toBe(false) // 10 + 25 = 35 > 30
  })

  it("aceita quando o novo consumido é exatamente 30", () => {
    const comDezDias = estado(1, 10, false)
    expect(podeAceitarNovoPeriodo(comDezDias, 20)).toBe(true) // 10 + 20 = 30, g passa a true (20>=14), saldo 0
  })
})

describe("R3 — casos normais com 0, 1, 2 e 3 períodos existentes", () => {
  it("0 períodos existentes: X=5, X=10, X=13 são aceitos isoladamente (saldo restante ainda viabiliza a cota de 14 depois)", () => {
    expect(podeAceitarNovoPeriodo(estado(0, 0, false), 5)).toBe(true) // saldo 25, periodosFuturos 2
    expect(podeAceitarNovoPeriodo(estado(0, 0, false), 10)).toBe(true) // saldo 20
    expect(podeAceitarNovoPeriodo(estado(0, 0, false), 13)).toBe(true) // saldo 17
  })

  it("0 períodos existentes: X=14 até X=25 são aceitos (cota satisfeita, saldo >=5 ou =0)", () => {
    for (const x of [14, 15, 20, 25, 30]) {
      expect(podeAceitarNovoPeriodo(estado(0, 0, false), x)).toBe(true)
    }
  })

  it("0 períodos existentes: X entre 26 e 29 são rejeitados (saldo entre 1 e 4)", () => {
    for (const x of [26, 27, 28, 29]) {
      expect(podeAceitarNovoPeriodo(estado(0, 0, false), x)).toBe(false)
    }
  })

  it("1 período existente (10 dias, cota pendente): X=10 rejeita, mas X=14 aceita", () => {
    const comDez = derivarEstadoFracionamento([10])
    expect(podeAceitarNovoPeriodo(comDez, 10)).toBe(false) // saldo 10, cota pendente
    expect(podeAceitarNovoPeriodo(comDez, 14)).toBe(true) // novoConsumido 24, cota satisfeita, saldo 6
  })

  it("1 período existente (14 dias, cota satisfeita): fronteiras de saldo 5/4 após o novo período", () => {
    const comQuatorze = derivarEstadoFracionamento([14])
    expect(podeAceitarNovoPeriodo(comQuatorze, 11)).toBe(true) // consumido 25, saldo 5
    expect(podeAceitarNovoPeriodo(comQuatorze, 12)).toBe(false) // consumido 26, saldo 4
  })

  it("2 períodos existentes (14+6=20, cota satisfeita): último período possível (periodosFuturos=0 após aceitar)", () => {
    const comQuatorzeESeis = derivarEstadoFracionamento([14, 6])
    expect(podeAceitarNovoPeriodo(comQuatorzeESeis, 10)).toBe(true) // consumido 30, saldo 0
    expect(podeAceitarNovoPeriodo(comQuatorzeESeis, 5)).toBe(true) // consumido 25, saldo 5
    expect(podeAceitarNovoPeriodo(comQuatorzeESeis, 9)).toBe(false) // consumido 29, saldo 1
  })

  it("2 períodos existentes sem cota satisfeita (hipotético): terceiro período pequeno não resolve, mesmo zerando o saldo", () => {
    // Estado hipotético usado para testar a função isoladamente — na
    // prática esse estado não seria alcançável se R3 for sempre aplicada
    // em sequência, pois o 2º período já teria sido rejeitado antes.
    // Importante: o terceiro período (X=20) TAMBÉM precisa ser pequeno
    // (<14) para que `novoExistePeriodoGrande` continue falso — do
    // contrário, o próprio X satisfaz a cota e o agendamento é aceito.
    const semCotaSatisfeita = estado(2, 10, false) // ex.: dois períodos de 5
    expect(podeAceitarNovoPeriodo(semCotaSatisfeita, 20)).toBe(true) // consumido 30, saldo 0, X=20 >= 14 satisfaz a cota
    expect(podeAceitarNovoPeriodo(semCotaSatisfeita, 5)).toBe(false) // consumido 15, saldo 15, X=5 não satisfaz a cota, periodosFuturos=0
  })

  it("3 períodos existentes: qualquer novo período é rejeitado, mesmo com saldo disponível", () => {
    const tresPeriodos = estado(3, 25, true)
    expect(podeAceitarNovoPeriodo(tresPeriodos, 5)).toBe(false)
  })
})

describe("R3 — derivarEstadoFracionamento", () => {
  it("lista vazia produz estado inicial (0 períodos, 0 dias, sem período grande)", () => {
    expect(derivarEstadoFracionamento([])).toEqual({
      quantidadePeriodosExistentes: 0,
      diasConsumidos: 0,
      existePeriodoGrande: false,
    })
  })

  it("detecta período grande independentemente da posição na lista", () => {
    expect(derivarEstadoFracionamento([5, 14, 6]).existePeriodoGrande).toBe(true)
    expect(derivarEstadoFracionamento([14, 5, 6]).existePeriodoGrande).toBe(true)
    expect(derivarEstadoFracionamento([5, 6, 5]).existePeriodoGrande).toBe(false)
  })

  it("soma os dias consumidos corretamente", () => {
    expect(derivarEstadoFracionamento([14, 6]).diasConsumidos).toBe(20)
  })
})

describe("R3 — validarNovoPeriodo (lança RegraNegocioError com código R3)", () => {
  it("não lança quando o período é válido", () => {
    expect(() => validarNovoPeriodo(estado(0, 0, false), 14)).not.toThrow()
  })

  it("lança RegraNegocioError com código R3 ao exceder o máximo de períodos", () => {
    try {
      validarNovoPeriodo(estado(3, 30, true), 5)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R3")
    }
  })

  it("lança RegraNegocioError com código R3 quando X < 5", () => {
    try {
      validarNovoPeriodo(estado(0, 0, false), 3)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R3")
      expect((error as RegraNegocioError).message).toMatch(/5 dias/)
    }
  })

  it("lança RegraNegocioError com código R3 quando excede 30 dias no total", () => {
    try {
      validarNovoPeriodo(estado(1, 20, true), 15)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R3")
    }
  })

  it("lança RegraNegocioError com código R3 no caso oficial 10+10 (cota de 14 nunca satisfeita)", () => {
    const comDez = derivarEstadoFracionamento([10])
    try {
      validarNovoPeriodo(comDez, 10)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R3")
      expect((error as RegraNegocioError).message).toContain("14")
    }
  })

  it("lança RegraNegocioError com código R3 no caso oficial 26 (saldo de 4 dias)", () => {
    try {
      validarNovoPeriodo(estado(0, 0, false), 26)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R3")
      expect((error as RegraNegocioError).message).toContain("4")
    }
  })

  it("mensagem de erro não expõe detalhes técnicos (sem nomes de tabela, stack trace, etc.)", () => {
    try {
      validarNovoPeriodo(estado(0, 0, false), 26)
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      const mensagem = (error as RegraNegocioError).message
      expect(mensagem).not.toMatch(/SELECT|INSERT|prisma|undefined|null|stack/i)
    }
  })
})
