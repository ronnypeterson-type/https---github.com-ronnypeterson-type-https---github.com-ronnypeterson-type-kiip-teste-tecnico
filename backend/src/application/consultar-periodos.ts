// Caso de uso: consultar saldo/períodos aquisitivos de um colaborador.
//
// Orquestra R1 (datas do aquisitivo) e R2 (datas do concessivo),
// calculando-as dinamicamente a partir de `colaborador.dataAdmissao` —
// nenhum período é persistido (decisão já registrada em PLAN.md).
//
// Decisão registrada em PLAN.md (seção "Atualização do plano — decisões
// da camada de aplicação", item 1): exibe os períodos do número 1 até o
// período aquisitivo vigente na data de `hoje`, inclusive.
//
// O saldo de cada período (dias agendados / dias disponíveis) é
// calculado somando a `quantidadeDias` apenas dos agendamentos com
// `status === "ativo"` daquele `periodoNumero` — agendamentos cancelados
// não consomem saldo, pelo mesmo princípio já usado por R3
// (`derivarEstadoFracionamento` opera só sobre períodos ativos).
//
// Não há nenhuma regra R1-R7 sendo duplicada aqui: a soma de dias
// agendados é uma agregação simples sobre os dados já trazidos pelo
// repository, não uma reimplementação de R3 (que decide se um NOVO
// agendamento pode ser aceito — pergunta diferente de "quantos dias já
// estão agendados").

import { isAfter, type CalendarDate } from "../utils/calendar-date.js"
import { calcularPeriodoAquisitivo, DIAS_ADQUIRIDOS_POR_PERIODO } from "../domain/periodo-aquisitivo.js"
import { calcularPeriodoConcessivo } from "../domain/periodo-concessivo.js"
import { RecursoNaoEncontradoError } from "./erros.js"
import type { AgendamentoRepository, ColaboradorRepository } from "./repositories.js"

export interface PeriodoComSaldo {
  readonly periodoNumero: number
  readonly aquisitivoInicio: CalendarDate
  readonly aquisitivoFim: CalendarDate
  readonly concessivoInicio: CalendarDate
  readonly concessivoFim: CalendarDate
  readonly diasAgendados: number
  readonly diasDisponiveis: number
}

export interface ConsultarPeriodosDependencias {
  readonly colaboradorRepository: ColaboradorRepository
  readonly agendamentoRepository: AgendamentoRepository
}

/**
 * Determina o número do período aquisitivo vigente na data `hoje`, para
 * um colaborador admitido em `dataAdmissao` — ou seja, o maior
 * `periodoNumero` cujo `dataInicio` (via R1) não é posterior a `hoje`.
 */
function determinarPeriodoVigente(dataAdmissao: CalendarDate, hoje: CalendarDate): number {
  let periodoNumero = 1

  while (!isAfter(calcularPeriodoAquisitivo(dataAdmissao, periodoNumero + 1).dataInicio, hoje)) {
    periodoNumero += 1
  }

  return periodoNumero
}

export async function consultarPeriodos(
  { colaboradorRepository, agendamentoRepository }: ConsultarPeriodosDependencias,
  colaboradorId: number,
  hoje: CalendarDate,
): Promise<PeriodoComSaldo[]> {
  const colaborador = await colaboradorRepository.buscarPorId(colaboradorId)

  if (!colaborador) {
    throw new RecursoNaoEncontradoError(`Colaborador com id ${colaboradorId} não encontrado.`)
  }

  const periodoVigente = determinarPeriodoVigente(colaborador.dataAdmissao, hoje)
  const agendamentosAtivos = await agendamentoRepository.listarAtivosPorColaborador(colaboradorId)

  const periodos: PeriodoComSaldo[] = []

  for (let periodoNumero = 1; periodoNumero <= periodoVigente; periodoNumero++) {
    const aquisitivo = calcularPeriodoAquisitivo(colaborador.dataAdmissao, periodoNumero)
    const concessivo = calcularPeriodoConcessivo(colaborador.dataAdmissao, periodoNumero)

    const diasAgendados = agendamentosAtivos
      .filter((agendamento) => agendamento.periodoNumero === periodoNumero)
      .reduce((soma, agendamento) => soma + agendamento.quantidadeDias, 0)

    periodos.push({
      periodoNumero,
      aquisitivoInicio: aquisitivo.dataInicio,
      aquisitivoFim: aquisitivo.dataFim,
      concessivoInicio: concessivo.dataInicio,
      concessivoFim: concessivo.dataFim,
      diasAgendados,
      diasDisponiveis: DIAS_ADQUIRIDOS_POR_PERIODO - diasAgendados,
    })
  }

  return periodos
}
