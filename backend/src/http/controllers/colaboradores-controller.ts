// Controller HTTP para colaboradores.
//
// Responsabilidade estrita (ver CLAUDE.md, seção "9. Separação de
// responsabilidades"): receber o request, validar/converter a entrada
// estrutural (formato, tipo, campo obrigatório — NUNCA regra de
// negócio), chamar o application service correspondente, e converter o
// resultado para a resposta HTTP. Nenhuma regra R1-R7 é avaliada aqui.

import type { Request, Response } from "express"
import { criarColaborador } from "../../application/criar-colaborador.js"
import { consultarPeriodos } from "../../application/consultar-periodos.js"
import { listarColaboradores } from "../../application/listar-colaboradores.js"
import type { AgendamentoRepository, ColaboradorRepository } from "../../application/repositories.js"
import { responderComErro } from "../erros-http.js"
import { hojeComoCalendarDate } from "../relogio.js"
import {
  formatarCentavos,
  formatarData,
  parseDataDoRequest,
  parseIdDaRota,
  parseSalarioDoRequest,
} from "../serializacao.js"

export interface ColaboradoresControllerDependencias {
  readonly colaboradorRepository: ColaboradorRepository
  readonly agendamentoRepository: AgendamentoRepository
}

export function criarColaboradoresController(deps: ColaboradoresControllerDependencias) {
  return {
    async listar(_req: Request, res: Response): Promise<void> {
      try {
        const colaboradores = await listarColaboradores({
          colaboradorRepository: deps.colaboradorRepository,
        })

        res.status(200).json({
          colaboradores: colaboradores.map((colaborador) => ({
            id: colaborador.id,
            nome: colaborador.nome,
            dataAdmissao: formatarData(colaborador.dataAdmissao),
            salarioMensal: formatarCentavos(colaborador.salarioCentavos),
          })),
        })
      } catch (erro) {
        responderComErro(res, erro)
      }
    },

    async criar(req: Request, res: Response): Promise<void> {
      try {
        const body = req.body as Record<string, unknown>

        const nome = typeof body.nome === "string" ? body.nome : ""
        const dataAdmissao = parseDataDoRequest(body.dataAdmissao, "dataAdmissao")
        const salarioCentavos = parseSalarioDoRequest(body.salarioMensal)

        const colaborador = await criarColaborador(
          { colaboradorRepository: deps.colaboradorRepository },
          { nome, dataAdmissao, salarioCentavos },
        )

        res.status(201).json({
          id: colaborador.id,
          nome: colaborador.nome,
          dataAdmissao: formatarData(colaborador.dataAdmissao),
          salarioMensal: formatarCentavos(colaborador.salarioCentavos),
        })
      } catch (erro) {
        responderComErro(res, erro)
      }
    },

    async consultarPeriodos(req: Request, res: Response): Promise<void> {
      try {
        const colaboradorId = parseIdDaRota(req.params.id, "id")
        const hoje = hojeComoCalendarDate()

        const periodos = await consultarPeriodos(
          {
            colaboradorRepository: deps.colaboradorRepository,
            agendamentoRepository: deps.agendamentoRepository,
          },
          colaboradorId,
          hoje,
        )

        res.status(200).json({
          periodos: periodos.map((periodo) => ({
            periodoNumero: periodo.periodoNumero,
            aquisitivoInicio: formatarData(periodo.aquisitivoInicio),
            aquisitivoFim: formatarData(periodo.aquisitivoFim),
            concessivoInicio: formatarData(periodo.concessivoInicio),
            concessivoFim: formatarData(periodo.concessivoFim),
            diasAdquiridos: 30,
            diasAgendados: periodo.diasAgendados,
            diasDisponiveis: periodo.diasDisponiveis,
          })),
        })
      } catch (erro) {
        responderComErro(res, erro)
      }
    },
  }
}
