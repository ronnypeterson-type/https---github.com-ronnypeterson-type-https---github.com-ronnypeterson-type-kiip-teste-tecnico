import { describe, expect, it } from "vitest"
import { createCalendarDate } from "../../../src/utils/calendar-date.js"
import { ColaboradorRepositoryFake } from "../../../src/application/fakes/colaborador-repository-fake.js"
import { AgendamentoRepositoryFake } from "../../../src/application/fakes/agendamento-repository-fake.js"
import { criarColaborador } from "../../../src/application/criar-colaborador.js"
import { consultarPeriodos } from "../../../src/application/consultar-periodos.js"
import { RecursoNaoEncontradoError } from "../../../src/application/erros.js"

describe("ConsultarPeriodos", () => {
  it("rejeita colaborador inexistente", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()
    const agendamentoRepository = new AgendamentoRepositoryFake()

    await expect(
      consultarPeriodos(
        { colaboradorRepository, agendamentoRepository },
        999,
        createCalendarDate(2026, 1, 1),
      ),
    ).rejects.toThrow(RecursoNaoEncontradoError)
  })

  it("calcula os períodos aquisitivos corretamente (R1/R2) do período 1 até o vigente, inclusive", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()
    const agendamentoRepository = new AgendamentoRepositoryFake()
    const deps = { colaboradorRepository, agendamentoRepository }

    // Admissão 15/03/2025: período 1 = 15/03/2025-14/03/2026; período 2 = 15/03/2026-14/03/2027.
    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    // "Hoje" = 20/03/2026, já dentro do período 2 (que começou em 15/03/2026).
    const periodos = await consultarPeriodos(deps, colaborador.id, createCalendarDate(2026, 3, 20))

    expect(periodos).toHaveLength(2)
    expect(periodos[0]).toMatchObject({
      periodoNumero: 1,
      aquisitivoInicio: { year: 2025, month: 3, day: 15 },
      aquisitivoFim: { year: 2026, month: 3, day: 14 },
      concessivoInicio: { year: 2026, month: 3, day: 15 },
      concessivoFim: { year: 2027, month: 3, day: 14 },
    })
    expect(periodos[1]).toMatchObject({
      periodoNumero: 2,
      aquisitivoInicio: { year: 2026, month: 3, day: 15 },
    })
  })

  it("o período vigente é incluído na listagem (não parado um período antes)", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()
    const agendamentoRepository = new AgendamentoRepositoryFake()
    const deps = { colaboradorRepository, agendamentoRepository }

    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    // "Hoje" ainda dentro do período 1 (antes de 15/03/2026).
    const periodos = await consultarPeriodos(deps, colaborador.id, createCalendarDate(2026, 1, 1))

    expect(periodos).toHaveLength(1)
    expect(periodos[0].periodoNumero).toBe(1)
  })

  it("saldo considera somente agendamentos ativos (cancelados não consomem saldo)", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()
    const agendamentoRepository = new AgendamentoRepositoryFake()
    const deps = { colaboradorRepository, agendamentoRepository }

    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    const ativo = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2025, 4, 1),
      quantidadeDias: 10,
    })
    const cancelado = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2025, 6, 1),
      quantidadeDias: 15,
    })
    await agendamentoRepository.cancelar(cancelado.id)

    const periodos = await consultarPeriodos(deps, colaborador.id, createCalendarDate(2026, 1, 1))

    // Somente os 10 dias do agendamento ativo contam; os 15 do cancelado não.
    expect(periodos[0].diasAgendados).toBe(10)
    expect(periodos[0].diasDisponiveis).toBe(20)
  })
})
