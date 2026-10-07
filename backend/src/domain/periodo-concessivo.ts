// Regra R2 — Período concessivo (ver CLAUDE.md, seção "6. Regras de
// negócio R1-R7"):
//
// As férias de um período aquisitivo só podem ser gozadas dentro do
// respectivo período concessivo, que corresponde aos 12 meses seguintes
// ao fim do período aquisitivo. Antes do início do período concessivo,
// NÃO é permitido agendar férias. Todos os dias do agendamento devem
// estar dentro do período concessivo. Após o fim do período concessivo,
// os dias não utilizados são perdidos.
//
// Direção de implementação (reaproveitando R1, sem duplicar a lógica de
// aniversário): o início do concessivo do aquisitivo N é exatamente o
// início do aquisitivo N+1, e o fim do concessivo do aquisitivo N é
// exatamente o fim do aquisitivo N+1 — ou seja, o concessivo de um
// aquisitivo É o intervalo do aquisitivo seguinte. Por isso, esta função
// não recalcula nada por conta própria: delega inteiramente para
// `calcularPeriodoAquisitivo(dataAdmissao, periodoNumero + 1)`.
//
// Esta função é pura: não acessa banco, HTTP ou qualquer estado externo.
// Não persiste nada (decisão registrada em PLAN.md, seção "Atualização do
// plano — decisões de modelagem e domínio", item 1: período concessivo
// nunca é persistido separadamente).
//
// Apenas R2 é implementada aqui. R3-R7, agendamento, saldo e qualquer
// outra regra de negócio ficam para etapas posteriores. Esta etapa não
// implementa R6 ("hoje") nem R5 (sobreposição) — a validação de intervalo
// abaixo verifica apenas se um período está contido no concessivo.

import { isAfter, isBefore, type CalendarDate } from "../utils/calendar-date.js"
import { calcularPeriodoAquisitivo } from "./periodo-aquisitivo.js"

export interface PeriodoConcessivo {
  readonly periodoNumero: number
  readonly dataInicio: CalendarDate
  readonly dataFim: CalendarDate
}

/**
 * Calcula o período concessivo do aquisitivo número `periodoNumero` de um
 * colaborador admitido em `dataAdmissao`, aplicando a regra R2.
 *
 * O concessivo de um aquisitivo é exatamente o intervalo do aquisitivo
 * seguinte — por isso a validação de `periodoNumero` e o tratamento de
 * casos de borda (ex.: admissão em 29/02) são inteiramente herdados de
 * `calcularPeriodoAquisitivo`, sem duplicação.
 *
 * @throws Error se `periodoNumero` não for um número inteiro maior ou
 *   igual a 1 (mesma validação de `calcularPeriodoAquisitivo`).
 */
export function calcularPeriodoConcessivo(
  dataAdmissao: CalendarDate,
  periodoNumero: number,
): PeriodoConcessivo {
  const aquisitivoSeguinte = calcularPeriodoAquisitivo(dataAdmissao, periodoNumero + 1)

  return {
    periodoNumero,
    dataInicio: aquisitivoSeguinte.dataInicio,
    dataFim: aquisitivoSeguinte.dataFim,
  }
}

/**
 * Verifica se um intervalo de férias [`inicio`, `fim`] está integralmente
 * contido em um período concessivo — ou seja, se `inicio` e `fim` (e,
 * por consequência, todos os dias entre eles) estão dentro de
 * [`concessivo.dataInicio`, `concessivo.dataFim`], incluindo os extremos.
 *
 * Início antes do concessivo, fim depois do concessivo, ou qualquer
 * sobreposição apenas parcial, resultam em `false`.
 */
export function estaDentroDoConcessivo(
  inicio: CalendarDate,
  fim: CalendarDate,
  concessivo: PeriodoConcessivo,
): boolean {
  const inicioAntesDoConcessivo = isBefore(inicio, concessivo.dataInicio)
  const fimDepoisDoConcessivo = isAfter(fim, concessivo.dataFim)

  return !inicioAntesDoConcessivo && !fimDepoisDoConcessivo
}
