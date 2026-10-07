import { describe, expect, it } from "vitest"
import { formatarData } from "./formatarData.js"

describe("formatarData", () => {
  it("converte uma data civil YYYY-MM-DD para o formato brasileiro DD/MM/YYYY", () => {
    expect(formatarData("2026-11-16")).toBe("16/11/2026")
  })

  it("não desloca o dia por timezone (não usa new Date())", () => {
    // Datas próximas à virada de mês/ano são o cenário mais sensível a
    // bugs de timezone caso a implementação usasse `new Date()`.
    expect(formatarData("2027-01-01")).toBe("01/01/2027")
    expect(formatarData("2026-12-31")).toBe("31/12/2026")
  })

  it("devolve o valor bruto quando o formato não é o esperado", () => {
    expect(formatarData("data-invalida")).toBe("data-invalida")
  })
})
