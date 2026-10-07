// Formata uma string decimal monetária (ex.: "1633.33", exatamente
// como a API devolve — ver backend/EXEMPLOS_CURL.md) para exibição em
// reais (ex.: "R$ 1.633,33").
//
// NUNCA converte o valor para `Number` para fazer a formatação —
// trabalha só com manipulação de string, preservando exatamente os
// centavos recebidos do backend. O frontend não recalcula nenhum
// valor de R7; apenas apresenta o que a API já calculou.
export function formatarMoeda(valorDecimal: string): string {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(valorDecimal)

  if (!match) {
    // Formato inesperado: exibe o valor bruto em vez de quebrar a UI
    // ou inventar um número.
    return valorDecimal
  }

  const [, sinal, parteInteira, centavos] = match

  const parteInteiraComMilhar = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  return `${sinal}R$ ${parteInteiraComMilhar},${centavos}`
}
