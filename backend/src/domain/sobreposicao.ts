// Regra R5 — Sem sobreposição (ver CLAUDE.md, seção "6. Regras de
// negócio R1-R7"):
//
// Períodos de férias do mesmo colaborador não podem se sobrepor,
// inclusive quando pertencem a períodos aquisitivos diferentes.
//
// Modelo (ver análise prévia registrada na conversa de desenvolvimento):
// um agendamento é representado como um intervalo de datas INCLUSIVO
// [dataInicio, dataFim]. A data final não é persistida (decisão
// registrada em PLAN.md) — é sempre derivada de
// `addDays(dataInicio, quantidadeDias - 1)`.
//
// Dois intervalos inclusivos [inicioA, fimA] e [inicioB, fimB] NÃO se
// sobrepõem apenas quando um termina estritamente antes do outro
// começar. Logo, a condição de sobreposição é a negação disso:
//
//   seSobrepoem(A, B) = !isAfter(inicioA, fimB) && !isAfter(inicioB, fimA)
//
// Essa fórmula fechada cobre, sem necessidade de nenhum caso especial:
// início/fim coincidentes, contenção total de um intervalo dentro do
// outro, e sobreposição de apenas 1 dia — qualquer combinação em que os
// dois intervalos compartilhem ao menos um dia resulta em sobreposição.
//
// Esta função NÃO filtra por status (ativo/cancelado) nem por
// periodoNumero: ela trabalha exatamente sobre a lista de intervalos que
// recebe, comparando todos contra todos. A responsabilidade de fornecer
// apenas os agendamentos ATIVOS do colaborador (ignorando cancelados) é
// da futura camada de integração (service/repository), não desta função
// pura de domínio. Da mesma forma, a comparação nunca deve ser filtrada
// por período aquisitivo — o texto da regra é explícito: "inclusive
// quando pertencem a períodos aquisitivos diferentes".
//
// Esta função é pura: não acessa banco, HTTP ou qualquer estado externo.
// Não importa Prisma nem Express. Não usa `Date` do JavaScript — toda
// aritmética de datas usa `CalendarDate` e as primitivas já existentes
// em calendar-date.ts. Não implementa R1, R2, R3, R4, R6 ou R7.

import { addDays, isAfter, type CalendarDate } from "../utils/calendar-date.js"
import { RegraNegocioError } from "./regra-negocio-error.js"

/** Representação de um intervalo de férias, inclusivo nas duas pontas. */
export interface IntervaloFerias {
  readonly dataInicio: CalendarDate
  readonly dataFim: CalendarDate
}

/**
 * Deriva a data final (inclusiva) de um agendamento a partir da data de
 * início e da quantidade de dias. Não é persistida — é sempre recalculada
 * a partir desses dois valores.
 *
 * Com `quantidadeDias = 1`, `dataFim` é igual a `dataInicio` (um único
 * dia de férias, início e fim coincidem).
 */
export function calcularDataFim(dataInicio: CalendarDate, quantidadeDias: number): CalendarDate {
  if (!Number.isInteger(quantidadeDias) || quantidadeDias < 1) {
    throw new Error(
      `Quantidade de dias inválida: ${quantidadeDias}. Deve ser um número inteiro maior ou igual a 1.`,
    )
  }

  return addDays(dataInicio, quantidadeDias - 1)
}

/**
 * Verifica se dois intervalos inclusivos de férias se sobrepõem —
 * ou seja, se compartilham ao menos um dia de calendário em comum.
 *
 * Fórmula fechada (ver cabeçalho do arquivo): os intervalos NÃO se
 * sobrepõem apenas quando um termina estritamente antes do outro
 * começar. A condição abaixo é a negação disso, e é simétrica em
 * relação à ordem dos argumentos (`seSobrepoem(A, B) === seSobrepoem(B, A)`).
 */
export function seSobrepoem(a: IntervaloFerias, b: IntervaloFerias): boolean {
  return !isAfter(a.dataInicio, b.dataFim) && !isAfter(b.dataInicio, a.dataFim)
}

/**
 * Verifica se `novoIntervalo` conflita (se sobrepõe) com algum dos
 * intervalos em `intervalosExistentes`. Não filtra a lista recebida por
 * status ou período aquisitivo — compara contra todos os itens
 * fornecidos, exatamente como recebidos.
 */
export function existeConflito(
  intervalosExistentes: readonly IntervaloFerias[],
  novoIntervalo: IntervaloFerias,
): boolean {
  return intervalosExistentes.some((existente) => seSobrepoem(existente, novoIntervalo))
}

/**
 * Valida `novoIntervalo` contra `intervalosExistentes`, lançando
 * `RegraNegocioError` (código "R5") com uma mensagem amigável caso haja
 * sobreposição com algum dos intervalos existentes. Não lança nada se
 * não houver conflito.
 */
export function validarSemSobreposicao(
  intervalosExistentes: readonly IntervaloFerias[],
  novoIntervalo: IntervaloFerias,
): void {
  if (existeConflito(intervalosExistentes, novoIntervalo)) {
    throw new RegraNegocioError(
      "R5",
      "Este período de férias se sobrepõe a outro período já agendado para este colaborador. Cancele o agendamento existente ou escolha datas diferentes.",
    )
  }
}
