import { describe, expect, it } from "vitest"
import { dataCivilEmSaoPaulo } from "../../src/http/relogio.js"

// Testa deterministicamente o risco corrigido nesta etapa: calcular
// "hoje" em UTC pode devolver um dia civil diferente do dia civil em
// America/Sao_Paulo (UTC-3), justamente no intervalo em que a data já
// virou em UTC mas ainda não virou em São Paulo (21h00–23h59 no
// horário de Brasília, sem horário de verão atualmente em vigor no
// Brasil). Os instantes abaixo são fixos (não usam `new Date()` sem
// argumento, nem o relógio real da máquina), logo o teste é
// determinístico e não depende de QUANDO é executado.

describe("dataCivilEmSaoPaulo", () => {
  it("usa o dia civil de São Paulo, não o de UTC, quando eles divergem", () => {
    // 2026-10-08T02:30:00Z = 2026-10-07T23:30:00 em America/Sao_Paulo
    // (UTC-3): já é dia 8 em UTC, mas ainda é dia 7 em São Paulo.
    const instante = new Date("2026-10-08T02:30:00Z")

    expect(instante.getUTCFullYear()).toBe(2026)
    expect(instante.getUTCMonth() + 1).toBe(10)
    expect(instante.getUTCDate()).toBe(8) // confirma a premissa: UTC já é dia 8

    const resultado = dataCivilEmSaoPaulo(instante)

    expect(resultado).toEqual({ year: 2026, month: 10, day: 7 }) // São Paulo ainda é dia 7
  })

  it("coincide com o dia civil de UTC quando não há divergência de fuso", () => {
    // 2026-10-07T15:00:00Z = 2026-10-07T12:00:00 em America/Sao_Paulo:
    // mesmo dia civil nos dois fusos (meio do dia, bem longe da virada).
    const instante = new Date("2026-10-07T15:00:00Z")

    const resultado = dataCivilEmSaoPaulo(instante)

    expect(resultado).toEqual({ year: 2026, month: 10, day: 7 })
  })

  it("também corrige corretamente a virada de mês/ano por timezone", () => {
    // 2027-01-01T01:00:00Z = 2026-12-31T22:00:00 em America/Sao_Paulo:
    // já é 1º de janeiro em UTC, mas ainda é 31 de dezembro em São Paulo.
    const instante = new Date("2027-01-01T01:00:00Z")

    expect(instante.getUTCFullYear()).toBe(2027)
    expect(instante.getUTCMonth() + 1).toBe(1)
    expect(instante.getUTCDate()).toBe(1)

    const resultado = dataCivilEmSaoPaulo(instante)

    expect(resultado).toEqual({ year: 2026, month: 12, day: 31 })
  })
})
