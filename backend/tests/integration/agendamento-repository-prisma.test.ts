// Testes de REPOSITORY real (Prisma + PostgreSQL) para
// `AgendamentoRepositoryPrisma`.
//
// IMPORTANTE — status de execução real: igual ao arquivo
// `colaborador-repository-prisma.test.ts` — esta suíte está marcada
// com `describe.skip` porque este ambiente (Brixly) não possui
// PostgreSQL disponível. Os testes estão escritos e type-checados, mas
// NUNCA foram executados contra um banco real nesta sessão.

import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { PrismaClient } from "@prisma/client"
import { createCalendarDate } from "../../src/utils/calendar-date.js"
import { ColaboradorRepositoryPrisma } from "../../src/infrastructure/prisma/colaborador-repository-prisma.js"
import { AgendamentoRepositoryPrisma } from "../../src/infrastructure/prisma/agendamento-repository-prisma.js"

describe.skip("AgendamentoRepositoryPrisma (integração — requer PostgreSQL real)", () => {
  const prisma = new PrismaClient()
  const colaboradorRepository = new ColaboradorRepositoryPrisma(prisma)
  const agendamentoRepository = new AgendamentoRepositoryPrisma(prisma)

  beforeEach(async () => {
    await prisma.agendamento.deleteMany()
    await prisma.colaborador.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function criarColaboradorDeTeste() {
    return colaboradorRepository.criar({
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })
  }

  it("cria um agendamento com status 'ativo' por padrão", async () => {
    const colaborador = await criarColaboradorDeTeste()

    const agendamento = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    })

    expect(agendamento.status).toBe("ativo")
  })

  it("busca um agendamento pelo id", async () => {
    const colaborador = await criarColaboradorDeTeste()
    const criado = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    })

    const encontrado = await agendamentoRepository.buscarPorId(criado.id)

    expect(encontrado?.id).toBe(criado.id)
  })

  it("lista apenas agendamentos ativos de um colaborador", async () => {
    const colaborador = await criarColaboradorDeTeste()
    const ativo = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    })
    const cancelado = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 4, 13),
      quantidadeDias: 5,
    })
    await agendamentoRepository.cancelar(cancelado.id)

    const ativos = await agendamentoRepository.listarAtivosPorColaborador(colaborador.id)

    expect(ativos).toHaveLength(1)
    expect(ativos[0].id).toBe(ativo.id)
  })

  it("lista agendamentos ativos filtrados por período aquisitivo", async () => {
    const colaborador = await criarColaboradorDeTeste()
    await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    })
    await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 2,
      dataInicio: createCalendarDate(2027, 3, 16),
      quantidadeDias: 10,
    })

    const doPeriodo1 = await agendamentoRepository.listarAtivosPorColaboradorEPeriodo(
      colaborador.id,
      1,
    )

    expect(doPeriodo1).toHaveLength(1)
    expect(doPeriodo1[0].periodoNumero).toBe(1)
  })

  it("listarTodosPorColaborador inclui agendamentos cancelados", async () => {
    const colaborador = await criarColaboradorDeTeste()
    const agendamento = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    })
    await agendamentoRepository.cancelar(agendamento.id)

    const todos = await agendamentoRepository.listarTodosPorColaborador(colaborador.id)

    expect(todos).toHaveLength(1)
    expect(todos[0].status).toBe("cancelado")
  })

  it("cancelar altera o status para 'cancelado' sem remover o registro", async () => {
    const colaborador = await criarColaboradorDeTeste()
    const agendamento = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    })

    await agendamentoRepository.cancelar(agendamento.id)
    const encontrado = await agendamentoRepository.buscarPorId(agendamento.id)

    expect(encontrado).not.toBeNull()
    expect(encontrado?.status).toBe("cancelado")
  })

  it("agendamento cancelado não aparece em listarAtivosPorColaborador", async () => {
    const colaborador = await criarColaboradorDeTeste()
    const agendamento = await agendamentoRepository.criar({
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      dataInicio: createCalendarDate(2026, 3, 16),
      quantidadeDias: 14,
    })
    await agendamentoRepository.cancelar(agendamento.id)

    const ativos = await agendamentoRepository.listarAtivosPorColaborador(colaborador.id)

    expect(ativos).toHaveLength(0)
  })

  it("executarComLockDoColaborador executa a operação dentro de uma transação e devolve o resultado", async () => {
    const colaborador = await criarColaboradorDeTeste()

    // Usa explicitamente o repository TRANSACIONAL recebido como
    // parâmetro do callback (`repoTransacional`), não a variável
    // `agendamentoRepository` do escopo externo — exatamente como o
    // application service `agendarFerias` faz (ver comentário em
    // agendar-ferias.ts sobre por que isso é importante: usar a
    // variável externa faria a operação ocorrer FORA da transação).
    const resultado = await agendamentoRepository.executarComLockDoColaborador(
      colaborador.id,
      async (repoTransacional) => {
        return repoTransacional.criar({
          colaboradorId: colaborador.id,
          periodoNumero: 1,
          dataInicio: createCalendarDate(2026, 3, 16),
          quantidadeDias: 14,
        })
      },
    )

    expect(resultado.status).toBe("ativo")

    const persistido = await agendamentoRepository.buscarPorId(resultado.id)
    expect(persistido).not.toBeNull()
  })
})
