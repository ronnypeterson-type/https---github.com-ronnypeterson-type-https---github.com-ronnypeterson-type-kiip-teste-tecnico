// Controller HTTP para agendamento/cancelamento/listagem de férias.
//
// Mesma responsabilidade estrita do `colaboradores-controller.ts`:
// nenhuma regra R1-R7 é avaliada aqui — toda validação de negócio é
// delegada aos application services (`agendarFerias`,
// `cancelarAgendamento`, `listarAgendamentos`), que por sua vez
// orquestram o domínio.

import type { Request, Response } from "express"
import { agendarFerias } from "../../application/agendar-ferias.js"
import { cancelarAgendamento } from "../../application/cancelar-agendamento.js"
import { listarAgendamentos } from "../../application/listar-agendamentos.js"
import type {
  Agendamento,
  AgendamentoRepository,
  ColaboradorRepository,
} from "../../application/repositories.js"
import { responderComErro } from "../erros-http.js"
import { hojeComoCalendarDate } from "../relogio.js"
import {
  formatarCentavos,
  formatarData,
  parseDataDoRequest,
  parseIdDaRota,
  parsePeriodoNumeroDoRequest,
  parseQuantidadeDiasDoRequest,
} from "../serializacao.js"
import type { ValoresFerias } from "../../domain/valores-ferias.js"
import type { CalendarDate } from "../../utils/calendar-date.js"

export interface FeriasControllerDependencias {
  readonly colaboradorRepository: ColaboradorRepository
  readonly agendamentoRepository: AgendamentoRepository
}

function serializarAgendamento(
  agendamento: Agendamento,
  dataFim: CalendarDate,
  valores: ValoresFerias,
) {
  return {
    id: agendamento.id,
    colaboradorId: agendamento.colaboradorId,
    periodoNumero: agendamento.periodoNumero,
    dataInicio: formatarData(agendamento.dataInicio),
    dataFim: formatarData(dataFim),
    quantidadeDias: agendamento.quantidadeDias,
    status: agendamento.status,
    valores: {
      remuneracao: formatarCentavos(valores.remuneracao),
      tercoConstitucional: formatarCentavos(valores.terco),
      total: formatarCentavos(valores.total),
    },
  }
}

export function criarFeriasController(deps: FeriasControllerDependencias) {
  return {
    async agendar(req: Request, res: Response): Promise<void> {
      try {
        const colaboradorId = parseIdDaRota(req.params.id, "id")
        const body = req.body as Record<string, unknown>

        const periodoNumero = parsePeriodoNumeroDoRequest(body.periodoNumero)
        const dataInicio = parseDataDoRequest(body.dataInicio, "dataInicio")
        const quantidadeDias = parseQuantidadeDiasDoRequest(body.quantidadeDias)

        const hoje = hojeComoCalendarDate()

        const resultado = await agendarFerias(
          {
            colaboradorRepository: deps.colaboradorRepository,
            agendamentoRepository: deps.agendamentoRepository,
          },
          { colaboradorId, periodoNumero, dataInicio, quantidadeDias },
          hoje,
        )

        res
          .status(201)
          .json(
            serializarAgendamento(resultado.agendamento, resultado.dataFim, resultado.valores),
          )
      } catch (erro) {
        responderComErro(res, erro)
      }
    },

    async cancelar(req: Request, res: Response): Promise<void> {
      try {
        // `colaboradorId` da rota não é usado para a lógica de
        // cancelamento em si (o application service já identifica o
        // agendamento pelo seu próprio id) — é validado aqui apenas
        // porque faz parte do formato da rota
        // `/colaboradores/:id/ferias/:agendamentoId`.
        parseIdDaRota(req.params.id, "id")
        const agendamentoId = parseIdDaRota(req.params.agendamentoId, "agendamentoId")

        const hoje = hojeComoCalendarDate()

        const agendamento = await cancelarAgendamento(
          { agendamentoRepository: deps.agendamentoRepository },
          agendamentoId,
          hoje,
        )

        res.status(200).json({
          id: agendamento.id,
          status: agendamento.status,
        })
      } catch (erro) {
        responderComErro(res, erro)
      }
    },

    async listar(req: Request, res: Response): Promise<void> {
      try {
        const colaboradorId = parseIdDaRota(req.params.id, "id")

        const lista = await listarAgendamentos(
          {
            colaboradorRepository: deps.colaboradorRepository,
            agendamentoRepository: deps.agendamentoRepository,
          },
          colaboradorId,
        )

        res.status(200).json({
          agendamentos: lista.map((item) =>
            serializarAgendamento(item.agendamento, item.dataFim, item.valores),
          ),
        })
      } catch (erro) {
        responderComErro(res, erro)
      }
    },
  }
}
