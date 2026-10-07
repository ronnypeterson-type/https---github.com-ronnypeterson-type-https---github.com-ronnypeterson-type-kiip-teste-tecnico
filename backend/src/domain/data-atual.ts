// Regra R6 — Hoje (ver CLAUDE.md, seção "6. Regras de negócio R1-R7"):
//
// Só é permitido agendar férias quando o início for posterior à data
// atual. Só é permitido cancelar um agendamento quando seu início for
// posterior à data atual.
//
// A condição é ESTRITAMENTE `dataInicio > hoje` — início igual a hoje ou
// anterior a hoje é rejeitado em ambos os casos (agendamento e
// cancelamento). Reutiliza `isAfter`, já existente em calendar-date.ts,
// sem duplicar nenhuma lógica de comparação de datas.
//
// "Hoje" é recebido SEMPRE como parâmetro explícito (`CalendarDate`),
// nunca calculado internamente via `new Date()` ou qualquer acesso ao
// relógio do sistema. Isso preserva a pureza das funções (mesmo
// princípio já seguido por R1-R5): duas chamadas com os mesmos
// argumentos sempre produzem o mesmo resultado, e os testes podem fixar
// "hoje" livremente, sem depender do dia em que são executados. A
// camada de integração (futura service), não o domínio, é responsável
// por obter a data real do sistema e convertê-la para `CalendarDate`
// antes de chamar estas funções.
//
// Este arquivo NÃO verifica status de agendamento (ativo/cancelado), não
// verifica existência de agendamento, não altera estado e não acessa
// banco — essas responsabilidades pertencem à futura camada de
// service/repository. As funções aqui recebem e comparam apenas datas.
//
// Estas funções são puras: não acessam banco, HTTP ou qualquer estado
// externo. Não usam `Date` do JavaScript. Não implementam R1-R5 ou R7.

import { isAfter, type CalendarDate } from "../utils/calendar-date.js"
import { RegraNegocioError } from "./regra-negocio-error.js"

/**
 * Verifica se `dataInicio` é estritamente posterior a `hoje` — a
 * condição comum exigida tanto para agendar quanto para cancelar
 * férias, conforme R6.
 */
export function ehDataFutura(dataInicio: CalendarDate, hoje: CalendarDate): boolean {
  return isAfter(dataInicio, hoje)
}

/**
 * Valida que `dataInicio` é uma data futura em relação a `hoje`, para a
 * operação de AGENDAR férias. Lança `RegraNegocioError` (código "R6")
 * caso `dataInicio` seja hoje ou anterior a hoje. Não lança nada se
 * `dataInicio` for posterior a `hoje`.
 */
export function validarAgendamentoFuturo(dataInicio: CalendarDate, hoje: CalendarDate): void {
  if (!ehDataFutura(dataInicio, hoje)) {
    throw new RegraNegocioError(
      "R6",
      "As férias só podem ser agendadas para uma data de início posterior a hoje. Escolha uma data futura.",
    )
  }
}

/**
 * Valida que `dataInicio` (do agendamento a ser cancelado) é uma data
 * futura em relação a `hoje`, para a operação de CANCELAR férias. Lança
 * `RegraNegocioError` (código "R6") caso `dataInicio` seja hoje ou
 * anterior a hoje. Não lança nada se `dataInicio` for posterior a
 * `hoje`.
 *
 * Esta função não verifica se o agendamento existe, está ativo, ou já
 * foi cancelado — isso é responsabilidade da futura camada de
 * service/repository, que tem acesso ao estado persistido.
 */
export function validarCancelamentoFuturo(dataInicio: CalendarDate, hoje: CalendarDate): void {
  if (!ehDataFutura(dataInicio, hoje)) {
    throw new RegraNegocioError(
      "R6",
      "Não é possível cancelar um período de férias cujo início já ocorreu ou é hoje.",
    )
  }
}
