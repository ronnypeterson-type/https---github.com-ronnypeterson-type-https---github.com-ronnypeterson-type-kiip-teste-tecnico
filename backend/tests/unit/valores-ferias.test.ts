import { describe, expect, it } from "vitest"
import { calcularValoresFerias } from "../../src/domain/valores-ferias.js"

// Todos os valores abaixo foram verificados por execução real do código
// (via tsx) antes de serem fixados como expectativa — incluindo os
// restos exatos da divisão por 30/90, para garantir que cada caso testa
// genuinamente o comportamento pretendido (meio centavo exato, abaixo,
// acima, etc.), não apenas valores "fáceis".

describe("R7 — calcularValoresFerias", () => {
  it("exemplo oficial: salário R$ 3.500,00, 14 dias", () => {
    const resultado = calcularValoresFerias(350000n, 14)
    expect(resultado.remuneracao).toBe(163333n) // R$ 1.633,33
    expect(resultado.terco).toBe(54444n) // R$ 544,44
    expect(resultado.total).toBe(217777n) // R$ 2.177,77
  })

  it("caso de meio centavo exato na remuneração: R$ 1.000,01, 15 dias", () => {
    const resultado = calcularValoresFerias(100001n, 15)
    // numerador = 1500015; 1500015/30 = 50000,5 exato (meio centavo) -> HALF_UP sobe para 50001
    expect(resultado.remuneracao).toBe(50001n) // R$ 500,01
  })

  it("caso de meio centavo simultâneo em remuneração e terço: R$ 1.000,05, 9 dias", () => {
    const resultado = calcularValoresFerias(100005n, 9)
    // numerador = 900045; 900045/30 = 30001,5 (meio) -> 30002; 900045/90 = 10000,5 (meio) -> 10001
    expect(resultado.remuneracao).toBe(30002n) // R$ 300,02
    expect(resultado.terco).toBe(10001n) // R$ 100,01
    expect(resultado.total).toBe(40003n) // R$ 400,03
  })

  it("caso crítico de arredondamento individual: R$ 1.000,00, 5 dias (soma dos arredondados difere de arredondar a soma)", () => {
    const resultado = calcularValoresFerias(100000n, 5)
    // remuneração exata = 500000/30 = 16666,6667 -> arredonda para 16667 (R$ 166,67)
    // terço exata = 500000/90 = 5555,5556 -> arredonda para 5556 (R$ 55,56)
    // soma dos arredondados = 22223 (R$ 222,23)
    // se fosse arredondada a soma exata (22222,2222...), o resultado seria 22222 (R$ 222,22) — DIFERENTE
    expect(resultado.remuneracao).toBe(16667n) // R$ 166,67
    expect(resultado.terco).toBe(5556n) // R$ 55,56
    expect(resultado.total).toBe(22223n) // R$ 222,23 — não 22222
  })

  it("resultado abaixo de meio centavo (terço): R$ 1.000,00, 10 dias", () => {
    const resultado = calcularValoresFerias(100000n, 10)
    // numerador = 1000000; 1000000 mod 90 = 10 (10/90 ≈ 0,111, bem abaixo de 0,5 -> não sobe)
    expect(resultado.remuneracao).toBe(33333n)
    expect(resultado.terco).toBe(11111n)
    expect(resultado.total).toBe(44444n)
  })

  it("resultado acima de meio centavo (terço): R$ 1.000,00, 8 dias", () => {
    const resultado = calcularValoresFerias(100000n, 8)
    // numerador = 800000; 800000 mod 90 = 80 (80/90 ≈ 0,889, bem acima de 0,5 -> sobe)
    expect(resultado.remuneracao).toBe(26667n)
    expect(resultado.terco).toBe(8889n)
    expect(resultado.total).toBe(35556n)
  })

  it("resultado divisível exatamente por 30 e por 90 (sem fração de centavo)", () => {
    const resultado = calcularValoresFerias(90000n, 1) // R$ 900,00, 1 dia
    // numerador = 90000; 90000/30 = 3000 exato; 90000/90 = 1000 exato — nada a arredondar
    expect(resultado.remuneracao).toBe(3000n) // R$ 30,00
    expect(resultado.terco).toBe(1000n) // R$ 10,00
    expect(resultado.total).toBe(4000n) // R$ 40,00
  })

  it("30 dias (aquisitivo inteiro): remuneração igual ao salário, terço igual a 1/3 do salário", () => {
    const resultado = calcularValoresFerias(300000n, 30) // R$ 3.000,00, 30 dias
    expect(resultado.remuneracao).toBe(300000n) // R$ 3.000,00 (salário × 30 / 30 = salário)
    expect(resultado.terco).toBe(100000n) // R$ 1.000,00 (salário × 30 / 90 = salário/3)
    expect(resultado.total).toBe(400000n)
  })

  it("salário pequeno (próximo ao salário mínimo nacional, como referência): R$ 1.412,00, 7 dias", () => {
    const resultado = calcularValoresFerias(141200n, 7)
    expect(resultado.remuneracao).toBe(32947n)
    expect(resultado.terco).toBe(10982n)
    expect(resultado.total).toBe(43929n)
  })

  it.each([
    [5, 58333n, 19444n, 77777n],
    [10, 116667n, 38889n, 155556n],
    [13, 151667n, 50556n, 202223n],
    [14, 163333n, 54444n, 217777n],
    [15, 175000n, 58333n, 233333n],
    [20, 233333n, 77778n, 311111n],
    [25, 291667n, 97222n, 388889n],
    [30, 350000n, 116667n, 466667n],
  ])(
    "diferentes quantidades de dias válidas (%i dias) com salário R$ 3.500,00",
    (dias, remuneracaoEsperada, tercoEsperado, totalEsperado) => {
      const resultado = calcularValoresFerias(350000n, dias)
      expect(resultado.remuneracao).toBe(remuneracaoEsperada)
      expect(resultado.terco).toBe(tercoEsperado)
      expect(resultado.total).toBe(totalEsperado)
    },
  )

  it("o total é sempre exatamente a soma da remuneração e do terço já arredondados (nunca recalculado de outra forma)", () => {
    const casos: [bigint, number][] = [
      [350000n, 14],
      [100001n, 15],
      [100005n, 9],
      [100000n, 5],
      [141200n, 7],
    ]

    for (const [salario, dias] of casos) {
      const resultado = calcularValoresFerias(salario, dias)
      expect(resultado.total).toBe(resultado.remuneracao + resultado.terco)
    }
  })

  describe("validações estruturais", () => {
    it("rejeita salário zero", () => {
      expect(() => calcularValoresFerias(0n, 14)).toThrow()
    })

    it("rejeita salário negativo", () => {
      expect(() => calcularValoresFerias(-100n, 14)).toThrow()
    })

    it("rejeita dias zero", () => {
      expect(() => calcularValoresFerias(350000n, 0)).toThrow()
    })

    it("rejeita dias negativo", () => {
      expect(() => calcularValoresFerias(350000n, -5)).toThrow()
    })

    it("rejeita dias não inteiro", () => {
      expect(() => calcularValoresFerias(350000n, 5.5)).toThrow()
    })
  })
})
