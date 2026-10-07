// Regra R3 — Fracionamento (ver CLAUDE.md, seção "6. Regras de negócio
// R1-R7"):
//
// Os 30 dias de um período aquisitivo podem ser divididos em no máximo 3
// períodos. Um período deve possuir pelo menos 14 dias; os demais devem
// possuir pelo menos 5 dias cada. Toda nova programação deve verificar se
// o saldo restante ainda pode ser distribuído respeitando essas regras —
// sem exigir que o saldo seja todo agendado imediatamente.
//
// Modelo matemático (derivado e validado antes da implementação, contra
// os 6 exemplos oficiais do enunciado — ver análise prévia registrada na
// conversa de desenvolvimento, e também no AI-LOG.md):
//
// O estado relevante de um aquisitivo, para fins de R3, é resumido em três
// valores (não é necessário preservar o tamanho individual de cada
// período existente além disso):
//   - quantidadePeriodosExistentes (0, 1 ou 2 — nunca 3, pois com 3 não há
//     mais nenhum novo período a aceitar);
//   - diasConsumidos (soma dos tamanhos dos períodos existentes);
//   - existePeriodoGrande (algum período existente já tem >= 14 dias).
//
// Ao avaliar um novo agendamento de X dias, calcula-se o estado
// resultante (novoConsumido, novoExistePeriodoGrande, saldo,
// periodosFuturos) e verifica-se se esse estado ainda é "completável" —
// ou seja, se existe alguma forma (não precisamos saber qual) de, algum
// dia, distribuir o saldo restante em até `periodosFuturos` períodos
// adicionais, terminando com a cota de >=14 satisfeita e cada período
// >=5. A prova de que essa fórmula fechada é equivalente a enumerar todas
// as distribuições possíveis está na análise matemática: a cota de >=14
// nunca pode ser formada pela soma de períodos menores, e qualquer saldo
// residual >=5 sempre cabe inteiro em um único período futuro — por isso
// não há necessidade de enumeração.
//
// Esta função é pura: não acessa banco, HTTP ou qualquer estado externo.
// Não implementa R1, R2, R4, R5, R6 ou R7.

import { RegraNegocioError } from "./regra-negocio-error.js"

/** Quantidade máxima de períodos (agendamentos ativos) por aquisitivo. */
export const MAXIMO_PERIODOS_POR_AQUISITIVO = 3

/** Quantidade mínima de dias para qualquer período. */
export const MINIMO_DIAS_POR_PERIODO = 5

/** Quantidade mínima de dias que pelo menos um período do aquisitivo deve ter. */
export const MINIMO_DIAS_PERIODO_PRINCIPAL = 14

/** Total de dias disponíveis em um período aquisitivo, conforme R1. */
export const TOTAL_DIAS_AQUISITIVO = 30

/**
 * Estado resumido de um aquisitivo, relevante para a decisão de R3.
 * Não inclui os tamanhos individuais dos períodos existentes — apenas o
 * que a fórmula de completabilidade de fato precisa (ver cabeçalho do
 * arquivo).
 */
export interface EstadoFracionamento {
  readonly quantidadePeriodosExistentes: number
  readonly diasConsumidos: number
  readonly existePeriodoGrande: boolean
}

/**
 * Deriva o `EstadoFracionamento` a partir da lista de tamanhos (em dias)
 * dos períodos já ativos (não cancelados) de um aquisitivo. Esta é a
 * forma mais simples de obter o estado quando se tem a lista de
 * agendamentos reais — usada pela camada de integração (service de
 * agendamento), não pelos testes de R3 em si, que podem construir o
 * estado diretamente quando mais conveniente.
 */
export function derivarEstadoFracionamento(tamanhosPeriodosExistentes: number[]): EstadoFracionamento {
  const diasConsumidos = tamanhosPeriodosExistentes.reduce((soma, tamanho) => soma + tamanho, 0)
  const existePeriodoGrande = tamanhosPeriodosExistentes.some(
    (tamanho) => tamanho >= MINIMO_DIAS_PERIODO_PRINCIPAL,
  )

  return {
    quantidadePeriodosExistentes: tamanhosPeriodosExistentes.length,
    diasConsumidos,
    existePeriodoGrande,
  }
}

/**
 * Verifica se um estado (saldo restante, quantos períodos futuros ainda
 * cabem, e se a cota de >=14 já foi satisfeita) é "completável" — ou
 * seja, se ainda existe alguma forma válida de distribuir o saldo
 * restante em até `periodosFuturos` períodos adicionais, respeitando "um
 * >=14, os demais >=5", eventualmente (não necessariamente de imediato).
 *
 * Fórmula fechada (ver cabeçalho do arquivo para a derivação):
 *   - se a cota de >=14 já foi satisfeita: completável se o saldo for 0
 *     ou >= 5 (um saldo entre 1 e 4 nunca pode ser descartado nem
 *     distribuído validamente);
 *   - se a cota de >=14 ainda está pendente: completável somente se
 *     ainda houver pelo menos um período futuro disponível E o saldo for
 *     >= 14 (a cota exige um único período que, sozinho, atinja 14 — não
 *     pode ser formada pela soma de períodos menores).
 */
export function ehCompletavel(
  saldo: number,
  periodosFuturos: number,
  existePeriodoGrande: boolean,
): boolean {
  if (existePeriodoGrande) {
    return saldo === 0 || saldo >= MINIMO_DIAS_POR_PERIODO
  }

  return periodosFuturos >= 1 && saldo >= MINIMO_DIAS_PERIODO_PRINCIPAL
}

/**
 * Avalia se um novo período de `quantidadeDias` dias pode ser aceito no
 * aquisitivo descrito por `estado`, aplicando a regra R3 por completo:
 * validações estruturais (máximo de períodos, mínimo de dias por
 * período, limite de 30 dias) seguidas da verificação de completabilidade
 * do estado resultante.
 *
 * Não lança erro — apenas informa, via retorno, se a operação é válida.
 * A camada de integração decide o que fazer com o resultado (ex.: lançar
 * `RegraNegocioError`, como em `validarNovoPeriodo` abaixo).
 */
export function podeAceitarNovoPeriodo(
  estado: EstadoFracionamento,
  quantidadeDias: number,
): boolean {
  if (estado.quantidadePeriodosExistentes >= MAXIMO_PERIODOS_POR_AQUISITIVO) {
    return false
  }

  if (quantidadeDias < MINIMO_DIAS_POR_PERIODO) {
    return false
  }

  const novoConsumido = estado.diasConsumidos + quantidadeDias

  if (novoConsumido > TOTAL_DIAS_AQUISITIVO) {
    return false
  }

  const novoExistePeriodoGrande =
    estado.existePeriodoGrande || quantidadeDias >= MINIMO_DIAS_PERIODO_PRINCIPAL
  const saldo = TOTAL_DIAS_AQUISITIVO - novoConsumido
  const periodosFuturos = MAXIMO_PERIODOS_POR_AQUISITIVO - (estado.quantidadePeriodosExistentes + 1)

  return ehCompletavel(saldo, periodosFuturos, novoExistePeriodoGrande)
}

/**
 * Valida um novo período de `quantidadeDias` dias contra a regra R3,
 * lançando `RegraNegocioError` (código "R3") com uma mensagem amigável e
 * específica para cada motivo de rejeição, caso a operação não seja
 * válida. Não lança nada se o período for válido.
 */
export function validarNovoPeriodo(estado: EstadoFracionamento, quantidadeDias: number): void {
  if (estado.quantidadePeriodosExistentes >= MAXIMO_PERIODOS_POR_AQUISITIVO) {
    throw new RegraNegocioError(
      "R3",
      `Este período aquisitivo já possui o máximo de ${MAXIMO_PERIODOS_POR_AQUISITIVO} períodos de férias agendados. Cancele um agendamento existente antes de criar um novo.`,
    )
  }

  if (quantidadeDias < MINIMO_DIAS_POR_PERIODO) {
    throw new RegraNegocioError(
      "R3",
      `Cada período de férias precisa ter pelo menos ${MINIMO_DIAS_POR_PERIODO} dias. O período informado tem ${quantidadeDias} dia(s).`,
    )
  }

  const novoConsumido = estado.diasConsumidos + quantidadeDias

  if (novoConsumido > TOTAL_DIAS_AQUISITIVO) {
    const diasDisponiveis = TOTAL_DIAS_AQUISITIVO - estado.diasConsumidos
    throw new RegraNegocioError(
      "R3",
      `Este período aquisitivo tem apenas ${diasDisponiveis} dia(s) de saldo disponível, mas o agendamento solicita ${quantidadeDias} dia(s).`,
    )
  }

  const novoExistePeriodoGrande =
    estado.existePeriodoGrande || quantidadeDias >= MINIMO_DIAS_PERIODO_PRINCIPAL
  const saldo = TOTAL_DIAS_AQUISITIVO - novoConsumido
  const periodosFuturos = MAXIMO_PERIODOS_POR_AQUISITIVO - (estado.quantidadePeriodosExistentes + 1)

  if (!ehCompletavel(saldo, periodosFuturos, novoExistePeriodoGrande)) {
    if (!novoExistePeriodoGrande) {
      throw new RegraNegocioError(
        "R3",
        `Este agendamento deixaria ${saldo} dia(s) de saldo sem que nenhum período tenha pelo menos ${MINIMO_DIAS_PERIODO_PRINCIPAL} dias, e não haveria mais períodos disponíveis para corrigir isso dentro do limite de ${MAXIMO_PERIODOS_POR_AQUISITIVO} períodos.`,
      )
    }

    throw new RegraNegocioError(
      "R3",
      `Este agendamento deixaria ${saldo} dia(s) de saldo, insuficiente para formar um novo período (mínimo de ${MINIMO_DIAS_POR_PERIODO} dias) e também não permitindo deixar o saldo zerado.`,
    )
  }
}
