import { describe, expect, it } from "vitest"
import { createCalendarDate } from "../../../src/utils/calendar-date.js"
import { ColaboradorRepositoryFake } from "../../../src/application/fakes/colaborador-repository-fake.js"
import { AgendamentoRepositoryFake } from "../../../src/application/fakes/agendamento-repository-fake.js"
import { criarColaborador } from "../../../src/application/criar-colaborador.js"
import { agendarFerias } from "../../../src/application/agendar-ferias.js"
import { cancelarAgendamento } from "../../../src/application/cancelar-agendamento.js"
import { consultarPeriodos } from "../../../src/application/consultar-periodos.js"
import { ConflitoDeEstadoError, RecursoNaoEncontradoError } from "../../../src/application/erros.js"

const HOJE = createCalendarDate(2026, 1, 1)

async function configurarCenarioComAgendamento() {
  const colaboradorRepository = new ColaboradorRepositoryFake()
  const agendamentoRepository = new AgendamentoRepositoryFake()
  const deps = { colaboradorRepository, agendamentoRepository }

  const colaborador = await criarColaborador(deps, {
    nome: "Ana",
    dataAdmissao: createCalendarDate(2025, 3, 15),
    salarioCentavos: 350000n,
  })

  const resultado = await agendarFerias(
    deps,
    {
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    },
    HOJE,
  )

  return { deps, colaborador, agendamento: resultado.agendamento }
}

describe("CancelarAgendamento", () => {
  it("sucesso: cancela um agendamento com início futuro", async () => {
    const { deps, agendamento } = await configurarCenarioComAgendamento()

    const cancelado = await cancelarAgendamento(deps, agendamento.id, HOJE)

    expect(cancelado.status).toBe("cancelado")
  })

  it("rejeita agendamento inexistente", async () => {
    const { deps } = await configurarCenarioComAgendamento()

    await expect(cancelarAgendamento(deps, 999, HOJE)).rejects.toThrow(RecursoNaoEncontradoError)
  })

  it("rejeita cancelar um agendamento já cancelado (conflito de estado, não RegraNegocioError)", async () => {
    const { deps, agendamento } = await configurarCenarioComAgendamento()

    await cancelarAgendamento(deps, agendamento.id, HOJE)

    await expect(cancelarAgendamento(deps, agendamento.id, HOJE)).rejects.toThrow(
      ConflitoDeEstadoError,
    )
  })

  it("rejeita por R6: cancelamento de agendamento cujo início não é mais futuro", async () => {
    const { deps, agendamento } = await configurarCenarioComAgendamento()

    // "hoje" avançado para depois da data de início (16/03/2026).
    await expect(
      cancelarAgendamento(deps, agendamento.id, createCalendarDate(2026, 4, 1)),
    ).rejects.toMatchObject({ codigo: "R6" })
  })

  it("o registro permanece existente após o cancelamento (não é removido)", async () => {
    const { deps, agendamento } = await configurarCenarioComAgendamento()

    await cancelarAgendamento(deps, agendamento.id, HOJE)

    const encontrado = await deps.agendamentoRepository.buscarPorId(agendamento.id)
    expect(encontrado).not.toBeNull()
    expect(encontrado?.status).toBe("cancelado")
  })

  it("o saldo volta a considerar os dias como disponíveis após o cancelamento", async () => {
    const { deps, colaborador, agendamento } = await configurarCenarioComAgendamento()

    const periodosAntes = await consultarPeriodos(deps, colaborador.id, HOJE)
    expect(periodosAntes[0].diasDisponiveis).toBe(16) // 30 - 14

    await cancelarAgendamento(deps, agendamento.id, HOJE)

    const periodosDepois = await consultarPeriodos(deps, colaborador.id, HOJE)
    expect(periodosDepois[0].diasDisponiveis).toBe(30)
    expect(periodosDepois[0].diasAgendados).toBe(0)
  })
})
