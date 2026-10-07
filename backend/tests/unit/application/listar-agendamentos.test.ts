import { describe, expect, it } from "vitest"
import { createCalendarDate } from "../../../src/utils/calendar-date.js"
import { ColaboradorRepositoryFake } from "../../../src/application/fakes/colaborador-repository-fake.js"
import { AgendamentoRepositoryFake } from "../../../src/application/fakes/agendamento-repository-fake.js"
import { criarColaborador } from "../../../src/application/criar-colaborador.js"
import { agendarFerias } from "../../../src/application/agendar-ferias.js"
import { cancelarAgendamento } from "../../../src/application/cancelar-agendamento.js"
import { listarAgendamentos } from "../../../src/application/listar-agendamentos.js"
import { RecursoNaoEncontradoError } from "../../../src/application/erros.js"

const HOJE = createCalendarDate(2026, 1, 1)

describe("ListarAgendamentos", () => {
  it("rejeita colaborador inexistente", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()
    const agendamentoRepository = new AgendamentoRepositoryFake()

    await expect(
      listarAgendamentos({ colaboradorRepository, agendamentoRepository }, 999),
    ).rejects.toThrow(RecursoNaoEncontradoError)
  })

  it("lista agendamentos ativos com data final calculada e valores R7", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()
    const agendamentoRepository = new AgendamentoRepositoryFake()
    const deps = { colaboradorRepository, agendamentoRepository }

    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    await agendarFerias(
      deps,
      {
        colaboradorId: colaborador.id,
        periodoNumero: 1,
        dataInicio: createCalendarDate(2026, 3, 16),
        quantidadeDias: 14,
      },
      HOJE,
    )

    const lista = await listarAgendamentos(deps, colaborador.id)

    expect(lista).toHaveLength(1)
    expect(lista[0].agendamento.status).toBe("ativo")
    expect(lista[0].dataFim).toEqual({ year: 2026, month: 3, day: 29 })
    expect(lista[0].valores).toEqual({
      remuneracao: 163333n,
      terco: 54444n,
      total: 217777n,
    })
  })

  it("inclui agendamentos cancelados na listagem (cancelamento é lógico, registro preservado)", async () => {
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

    await cancelarAgendamento(deps, resultado.agendamento.id, HOJE)

    const lista = await listarAgendamentos(deps, colaborador.id)

    expect(lista).toHaveLength(1)
    expect(lista[0].agendamento.status).toBe("cancelado")
  })
})
