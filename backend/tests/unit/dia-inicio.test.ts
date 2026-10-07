import { describe, expect, it } from "vitest"
import { createCalendarDate } from "../../src/utils/calendar-date.js"
import { ehInicioValidoR4, validarDiaInicio } from "../../src/domain/dia-inicio.js"
import { RegraNegocioError } from "../../src/domain/regra-negocio-error.js"

// Todos os valores de dia da semana e de validade abaixo foram obtidos
// por execução real da implementação (e, nos casos críticos, também
// verificados por fonte independente via utilitário `date` do sistema
// operacional) antes de serem fixados como expectativa nos testes —
// nenhum valor foi assumido de cabeça.

describe("R4 — ehInicioValidoR4", () => {
  describe("domingo e a janela de dois dias anteriores", () => {
    // 11/10/2026 é domingo (verificado); logo 10/10 é sábado (1 dia
    // antes) e 09/10 é sexta (2 dias antes).
    it("domingo é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 10, 11))).toBe(false)
    })

    it("sábado anterior ao domingo (1 dia antes) é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 10, 10))).toBe(false)
    })

    it("sexta anterior ao domingo (2 dias antes) é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 10, 9))).toBe(false)
    })

    it("quinta-feira (3 dias antes do domingo) já é válida — fora da janela de 2 dias", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 10, 8))).toBe(true)
    })
  })

  describe("feriados reais da tabela — janela F-2, F-1, F, F+1", () => {
    // 20/11/2026 é feriado e é sexta-feira (verificado). F+1 (21/11) cai
    // num SÁBADO (verificado de forma independente via `date` do
    // sistema) — por isso continua inválido, mas por uma razão
    // DIFERENTE e independente do feriado de 20/11: 21/11 (sábado) está
    // 1 dia antes do domingo 22/11, violando a janela de domingo, não a
    // de feriado. F+2 (22/11, domingo) e F+3 (23/11, segunda) confirmam
    // que o bloqueio de 21/11 não se estende por causa do feriado em si
    // — 23/11 (3 dias depois do feriado, fora de qualquer janela) já é
    // válido.
    it("20/11/2026 (feriado, sexta): F-2=18/11 inválido, F-1=19/11 inválido, F=20/11 inválido; F+1=21/11 (sábado) inválido por razão independente (janela do domingo 22/11); F+3=23/11 válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 18))).toBe(false) // F-2
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 19))).toBe(false) // F-1
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 20))).toBe(false) // F
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 21))).toBe(false) // sábado, bloqueado pela janela do domingo seguinte — não pelo feriado
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 23))).toBe(true) // segunda, fora de qualquer janela
    })

    // 25/12/2026 (Natal) é feriado e é sexta-feira. F+1 (26/12) também
    // cai num sábado (verificado) — mesma situação do caso acima: o
    // bloqueio de 26/12 é causado pela janela do domingo 27/12, não pelo
    // feriado de Natal.
    it("25/12/2026 (feriado, sexta): F-2=23/12 inválido, F-1=24/12 inválido, F=25/12 inválido; F+1=26/12 (sábado) inválido por razão independente (janela do domingo 27/12); F+3=28/12 válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 23))).toBe(false)
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 24))).toBe(false)
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 25))).toBe(false)
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 26))).toBe(false) // sábado, bloqueado pela janela do domingo 27/12 — não pelo feriado
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 28))).toBe(true) // segunda, fora de qualquer janela
    })

    // 21/04/2027 é feriado e é quarta-feira (verificado por execução).
    it("21/04/2027 (feriado, quarta-feira): F-2=19/04 inválido, F-1=20/04 inválido, F=21/04 inválido, F+1=22/04 válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 4, 19))).toBe(false)
      expect(ehInicioValidoR4(createCalendarDate(2027, 4, 20))).toBe(false)
      expect(ehInicioValidoR4(createCalendarDate(2027, 4, 21))).toBe(false)
      expect(ehInicioValidoR4(createCalendarDate(2027, 4, 22))).toBe(true)
    })
  })

  describe("exemplo oficial do enunciado: semana de 16/11/2026 a 20/11/2026", () => {
    it("16/11/2026 é válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 16))).toBe(true)
    })

    it("17/11/2026 é válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 17))).toBe(true)
    })

    it("18/11/2026 é inválido (2 dias antes do feriado de 20/11)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 18))).toBe(false)
    })

    it("19/11/2026 é inválido (1 dia antes do feriado de 20/11)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 19))).toBe(false)
    })

    it("20/11/2026 é inválido (é o próprio feriado)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 20))).toBe(false)
    })
  })

  describe("feriado coincidindo com domingo: 15/11/2026", () => {
    // Verificado por execução: 15/11/2026 é domingo E feriado
    // simultaneamente — exatamente o caso de sobreposição previsto na
    // análise. A fórmula (união de condições) trata isso sem necessidade
    // de caso especial: o resultado é bloqueado por qualquer uma das
    // duas razões, sem conflito.
    it("13/11/2026 (2 dias antes) é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 13))).toBe(false)
    })

    it("14/11/2026 (1 dia antes) é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 14))).toBe(false)
    })

    it("15/11/2026 (domingo E feriado simultaneamente) é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 15))).toBe(false)
    })

    it("16/11/2026 (logo depois) é válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 11, 16))).toBe(true)
    })
  })

  describe("feriado em segunda-feira: 15/11/2027", () => {
    // Verificado por execução: 15/11/2027 é segunda-feira. Isso significa
    // que o domingo anterior (14/11) já bloquearia 13/11 e 12/11 por
    // conta própria (janela de domingo), e o feriado de 15/11 bloqueia
    // adicionalmente 13/11 e 14/11 (janela de feriado) — uma sobreposição
    // real das duas regras, existente na tabela oficial, sem necessidade
    // de dado sintético.
    it("13/11/2027 é inválido (2 dias antes do feriado E 1 dia antes do domingo 14/11)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 11, 13))).toBe(false)
    })

    it("14/11/2027 (domingo) é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 11, 14))).toBe(false)
    })

    it("15/11/2027 (feriado, segunda-feira) é inválido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 11, 15))).toBe(false)
    })

    it("16/11/2027 é válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 11, 16))).toBe(true)
    })
  })

  describe("virada de ano: janela de 01/01/2027 (feriado)", () => {
    it("30/12/2026 é inválido (2 dias antes do feriado de 01/01/2027, atravessando o ano)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 30))).toBe(false)
    })

    it("31/12/2026 é inválido (1 dia antes do feriado de 01/01/2027)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 31))).toBe(false)
    })

    it("01/01/2027 é inválido (é o próprio feriado)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 1, 1))).toBe(false)
    })

    // 02/01/2027 cai num sábado (verificado) — continua inválido, mas
    // por uma razão independente do feriado de 01/01 (bloqueado pela
    // janela do domingo 03/01/2027, não pelo feriado). 04/01/2027
    // (segunda, fora de qualquer janela) é o primeiro dia realmente
    // livre após a virada de ano.
    it("02/01/2027 (sábado) é inválido por razão independente (janela do domingo 03/01), não pelo feriado de 01/01", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 1, 2))).toBe(false)
    })

    it("04/01/2027 (segunda, fora de qualquer janela) é válido", () => {
      expect(ehInicioValidoR4(createCalendarDate(2027, 1, 4))).toBe(true)
    })

    it("29/12/2026 (3 dias antes do feriado) já é válido — fora da janela de 2 dias", () => {
      expect(ehInicioValidoR4(createCalendarDate(2026, 12, 29))).toBe(true)
    })
  })

  describe("29/02/2028", () => {
    it("29/02/2028 é uma data válida de calendário e, neste caso, também válida como início de férias (sem feriado próximo e fora da janela de domingo)", () => {
      const data = createCalendarDate(2028, 2, 29)
      expect(() => data).not.toThrow()
      expect(ehInicioValidoR4(data)).toBe(true)
    })
  })

  describe("datas fora da janela de feriados fornecida (2026-2028) — não inventa feriado", () => {
    // 01/01/2025 é quarta-feira (verificado) — fora da tabela de
    // feriados (que só cobre 2026-2028), então é válido mesmo sendo a
    // mesma data de calendário que é feriado em 2026/2027/2028.
    it("01/01/2025 é válido (fora da tabela de feriados; não é domingo)", () => {
      expect(ehInicioValidoR4(createCalendarDate(2025, 1, 1))).toBe(true)
    })

    // 04/01/2025 é sábado e 05/01/2025 é domingo (verificados) — ambos
    // inválidos apenas pela regra de domingo, sem nenhum feriado
    // envolvido, demonstrando que a regra de domingo continua válida
    // fora da janela de feriados.
    it("04/01/2025 (sábado, 1 dia antes do domingo) é inválido só pela regra de domingo", () => {
      expect(ehInicioValidoR4(createCalendarDate(2025, 1, 4))).toBe(false)
    })

    it("05/01/2025 (domingo) é inválido só pela regra de domingo", () => {
      expect(ehInicioValidoR4(createCalendarDate(2025, 1, 5))).toBe(false)
    })
  })
})

describe("R4 — validarDiaInicio (lança RegraNegocioError com código R4)", () => {
  it("não lança quando a data é válida", () => {
    expect(() => validarDiaInicio(createCalendarDate(2026, 11, 16))).not.toThrow()
  })

  it("lança RegraNegocioError com código R4 quando a data é domingo", () => {
    try {
      validarDiaInicio(createCalendarDate(2026, 10, 11))
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R4")
    }
  })

  it("lança RegraNegocioError com código R4 quando a data é feriado", () => {
    try {
      validarDiaInicio(createCalendarDate(2026, 11, 20))
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      expect(error).toBeInstanceOf(RegraNegocioError)
      expect((error as RegraNegocioError).codigo).toBe("R4")
    }
  })

  it("mensagem de erro não expõe detalhes técnicos", () => {
    try {
      validarDiaInicio(createCalendarDate(2026, 11, 20))
      expect.unreachable("deveria ter lançado RegraNegocioError")
    } catch (error) {
      const mensagem = (error as RegraNegocioError).message
      expect(mensagem).not.toMatch(/SELECT|INSERT|prisma|undefined|null|stack/i)
    }
  })
})
