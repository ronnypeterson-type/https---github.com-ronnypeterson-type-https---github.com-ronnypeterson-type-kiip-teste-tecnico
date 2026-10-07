// Testes de INTEGRAÇÃO ponta a ponta: application service + repository
// Prisma + PostgreSQL real.
//
// IMPORTANTE — status de execução real: igual aos demais arquivos em
// `tests/integration/` — marcado com `describe.skip` porque este
// ambiente não possui PostgreSQL disponível. Os testes estão escritos
// e type-checados, mas NUNCA foram executados contra um banco real
// nesta sessão.
//
// Esta suíte não repete os testes matemáticos exaustivos de R1-R7 (já
// cobertos em `tests/unit/`) — testa apenas que a composição real
// (service + repository Prisma + Postgres) produz o mesmo
// comportamento já validado com os repositories fake.

import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { PrismaClient } from "@prisma/client"
import { createCalendarDate } from "../../src/utils/calendar-date.js"
import { criarRepositoriesPrisma } from "../../src/infrastructure/prisma/index.js"
import { criarColaborador } from "../../src/application/criar-colaborador.js"
import { consultarPeriodos } from "../../src/application/consultar-periodos.js"
import { agendarFerias } from "../../src/application/agendar-ferias.js"
import { cancelarAgendamento } from "../../src/application/cancelar-agendamento.js"
import { listarAgendamentos } from "../../src/application/listar-agendamentos.js"

const HOJE = createCalendarDate(2026, 1, 1)

describe.skip("Fluxos ponta a ponta (integração — requer PostgreSQL real)", () => {
  const prisma = new PrismaClient()
  const deps = criarRepositoriesPrisma(prisma)

  beforeEach(async () => {
    await prisma.agendamento.deleteMany()
    await prisma.colaborador.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("1. cria colaborador", async () => {
    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    expect(colaborador.id).toBeGreaterThan(0)
  })

  it("2. consulta períodos com saldo", async () => {
    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    const periodos = await consultarPeriodos(deps, colaborador.id, HOJE)

    expect(periodos[0].diasDisponiveis).toBe(30)
  })

  it("3. agenda férias válidas", async () => {
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

    expect(resultado.valores).toEqual({ remuneracao: 163333n, terco: 54444n, total: 217777n })
  })

  it("4. rejeita por R2 (fora do concessivo)", async () => {
    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    await expect(
      agendarFerias(
        deps,
        {
          colaboradorId: colaborador.id,
          periodoNumero: 1,
          dataInicio: createCalendarDate(2025, 4, 1),
          quantidadeDias: 14,
        },
        HOJE,
      ),
    ).rejects.toMatchObject({ codigo: "R2" })
  })

  it("5. rejeita por R3 (fracionamento inviável)", async () => {
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

    await expect(
      agendarFerias(
        deps,
        {
          colaboradorId: colaborador.id,
          periodoNumero: 1,
          dataInicio: createCalendarDate(2026, 4, 13),
          quantidadeDias: 12,
        },
        HOJE,
      ),
    ).rejects.toMatchObject({ codigo: "R3" })
  })

  it("6. rejeita por R4 (início em domingo)", async () => {
    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    await expect(
      agendarFerias(
        deps,
        {
          colaboradorId: colaborador.id,
          periodoNumero: 1,
          dataInicio: createCalendarDate(2026, 3, 22), // domingo
          quantidadeDias: 5,
        },
        HOJE,
      ),
    ).rejects.toMatchObject({ codigo: "R4" })
  })

  it("7. rejeita por R5 (sobreposição)", async () => {
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

    await expect(
      agendarFerias(
        deps,
        {
          colaboradorId: colaborador.id,
          periodoNumero: 1,
          dataInicio: createCalendarDate(2026, 3, 23),
          quantidadeDias: 5,
        },
        HOJE,
      ),
    ).rejects.toMatchObject({ codigo: "R5" })
  })

  it("8. rejeita por R6 (início não futuro)", async () => {
    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    await expect(
      agendarFerias(
        deps,
        {
          colaboradorId: colaborador.id,
          periodoNumero: 1,
          dataInicio: createCalendarDate(2026, 3, 16),
          quantidadeDias: 14,
        },
        createCalendarDate(2026, 4, 1),
      ),
    ).rejects.toMatchObject({ codigo: "R6" })
  })

  it("9. cancela um agendamento", async () => {
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

    const cancelado = await cancelarAgendamento(deps, resultado.agendamento.id, HOJE)

    expect(cancelado.status).toBe("cancelado")
  })

  it("10. consulta saldo depois do cancelamento (dias voltam a ficar disponíveis)", async () => {
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

    const periodos = await consultarPeriodos(deps, colaborador.id, HOJE)

    expect(periodos[0].diasDisponiveis).toBe(30)
  })

  it("11. lista agendamentos com valores R7", async () => {
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
    expect(lista[0].valores).toEqual({ remuneracao: 163333n, terco: 54444n, total: 217777n })
  })
})
