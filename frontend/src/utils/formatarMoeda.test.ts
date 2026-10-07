import { describe, expect, it } from "vitest"
import { formatarMoeda } from "./formatarMoeda.js"

describe("formatarMoeda", () => {
  it("formata um valor decimal simples em reais", () => {
    expect(formatarMoeda("1633.33")).toBe("R$ 1.633,33")
  })

  it("formata um valor com mais de um separador de milhar", () => {
    expect(formatarMoeda("1234567.89")).toBe("R$ 1.234.567,89")
  })

  it("formata um valor sem separador de milhar", () => {
    expect(formatarMoeda("544.44")).toBe("R$ 544,44")
  })

  it("preserva centavos exatos, incluindo zero à esquerda do centavo", () => {
    expect(formatarMoeda("100.05")).toBe("R$ 100,05")
  })

  it("formata um valor negativo", () => {
    expect(formatarMoeda("-50.00")).toBe("-R$ 50,00")
  })

  it("devolve o valor bruto quando o formato não é o esperado (nunca inventa um número)", () => {
    expect(formatarMoeda("não é número")).toBe("não é número")
  })
})
