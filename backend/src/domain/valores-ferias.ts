// Regra R7 — Valores (ver CLAUDE.md, seção "6. Regras de negócio
// R1-R7"):
//
// Remuneração = salário × dias ÷ 30
// Terço constitucional = salário × dias ÷ 90
// Total = remuneração arredondada + terço arredondado
//
// Os valores devem ser calculados com precisão completa durante o
// cálculo; o arredondamento para centavos (regra HALF_UP — meio centavo
// sobe) ocorre individualmente em cada um dos dois valores, ANTES da
// soma. O total nunca é obtido arredondando a soma dos valores exatos.
//
// Estratégia de precisão monetária (ver análise matemática prévia
// registrada na conversa de desenvolvimento, validada por prova
// algébrica e testes exaustivos antes desta implementação): o domínio de
// R7 representa valores monetários como `bigint` de centavos — nunca
// `number`/float, nunca `Prisma.Decimal`, nunca `decimal.js`. Isso evita
// tanto o erro de ponto flutuante binário quanto qualquer dependência de
// `@prisma/client` dentro do domínio (decisão explícita: o domínio não
// deve conhecer o ORM; a futura camada de persistência é responsável por
// converter `Prisma.Decimal`/`NUMERIC(10,2)` para `bigint` de centavos
// antes de chamar estas funções, e por converter o resultado de volta,
// se necessário, para exibição).
//
// Fórmula de arredondamento HALF_UP usando somente `bigint`:
//   arredondarHalfUp(numerador, divisor) = (numerador*2 + divisor) / (divisor*2)
// Prova (para numerador, divisor > 0): escrevendo numerador/divisor =
// q + r/divisor (q = quociente inteiro, r = resto, 0 <= r < divisor),
// floor(numerador/divisor + 1/2) = q + floor((2r+divisor)/(2*divisor)),
// e esse termo extra vale 1 exatamente quando 2r >= divisor (ou seja,
// r/divisor >= 0,5) e 0 caso contrário — que é exatamente "meio sobe".
// A divisão de `bigint` em JavaScript trunca, o que equivale a `floor`
// para operandos positivos (nunca negativos neste domínio — ver abaixo).
//
// Esta implementação assume que `salarioCentavos` e `dias` são sempre
// positivos (decorre das regras já implementadas: salário positivo por
// constraint de banco; dias validados por R3/R6 antes de chegar aqui).
// Não há suporte preventivo para valores negativos — não é necessário
// e não deve ser adicionado.
//
// Não é uma biblioteca monetária genérica: contém apenas as três
// operações que R7 exige (multiplicar por inteiro, dividir com
// arredondamento HALF_UP, somar valores já arredondados).
//
// Esta função é pura: não acessa banco, HTTP ou qualquer estado externo.
// Não importa Prisma, @prisma/client, decimal.js ou qualquer biblioteca
// financeira. Não usa `Number`, `parseFloat` ou `toFixed` em nenhum
// ponto do cálculo. Não implementa R1-R6.

/**
 * Valor monetário do domínio, representado como quantidade inteira de
 * centavos (`bigint`). Nunca `number`/float.
 */
export type CentavosDinheiro = bigint

/**
 * Arredonda a divisão `numerador / divisor` para o inteiro mais próximo,
 * usando a regra HALF_UP ("meio sobe"), operando inteiramente em
 * `bigint`. Requer `numerador >= 0` e `divisor > 0`.
 */
function arredondarHalfUp(numerador: bigint, divisor: bigint): bigint {
  if (divisor <= 0n) {
    throw new Error("Divisor para arredondamento deve ser positivo.")
  }

  if (numerador < 0n) {
    throw new Error("Esta implementação de arredondamento não suporta numerador negativo.")
  }

  return (numerador * 2n + divisor) / (divisor * 2n)
}

export interface ValoresFerias {
  readonly remuneracao: CentavosDinheiro
  readonly terco: CentavosDinheiro
  readonly total: CentavosDinheiro
}

/**
 * Calcula os valores financeiros de um período de férias, conforme R7:
 *   remuneração = HALF_UP(salário × dias ÷ 30)
 *   terço       = HALF_UP(salário × dias ÷ 90)
 *   total       = remuneração arredondada + terço arredondado
 *
 * `salarioCentavos` é o salário mensal em centavos inteiros (ex.:
 * R$ 3.500,00 → 350000n). `dias` é a quantidade de dias do período,
 * já validada pela camada responsável (R3) — esta função não duplica
 * essa validação, apenas rejeita entradas estruturalmente absurdas
 * (zero, negativo ou não inteiro), que indicariam uso incorreto da
 * função por quem a chama, não uma regra de negócio de R7.
 *
 * A soma final nunca é calculada arredondando o total diretamente — os
 * dois valores são arredondados individualmente primeiro, exatamente
 * como a regra exige.
 */
export function calcularValoresFerias(
  salarioCentavos: CentavosDinheiro,
  dias: number,
): ValoresFerias {
  if (salarioCentavos <= 0n) {
    throw new Error(`Salário inválido: ${salarioCentavos}. Deve ser um valor positivo em centavos.`)
  }

  if (!Number.isInteger(dias) || dias <= 0) {
    throw new Error(`Quantidade de dias inválida: ${dias}. Deve ser um número inteiro positivo.`)
  }

  const numerador = salarioCentavos * BigInt(dias)

  const remuneracao = arredondarHalfUp(numerador, 30n)
  const terco = arredondarHalfUp(numerador, 90n)
  const total = remuneracao + terco

  return { remuneracao, terco, total }
}
