// Testes de REPOSITORY real (Prisma + PostgreSQL) para
// `ColaboradorRepositoryPrisma`.
//
// IMPORTANTE — status de execução real: este ambiente de
// desenvolvimento (Brixly) NÃO possui PostgreSQL disponível (confirmado
// por verificação direta antes desta implementação: `docker`, `psql` e
// `pg_isready` não existem neste ambiente). Por isso, esta suíte está
// marcada com `describe.skip` — os testes estão escritos, type-checados
// e prontos, mas NUNCA foram executados contra um PostgreSQL real nesta
// sessão. Não afirmar "testado" para esta suíte até que ela seja
// executada em um ambiente com PostgreSQL disponível (ver PLAN.md,
// seção de validação externa).
//
// Para executar esta suíte em um ambiente com Docker/PostgreSQL
// disponível:
//   1. Subir o PostgreSQL (ex.: via docker-compose, quando existir).
//   2. Definir DATABASE_URL apontando para esse banco.
//   3. Rodar `npx prisma migrate deploy`.
//   4. Remover `.skip` de `describe.skip` abaixo (ou rodar com um
//      mecanismo de variável de ambiente que decida isso
//      automaticamente — não implementado nesta etapa).
//   5. `npx vitest run tests/integration/colaborador-repository-prisma.test.ts`

import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { PrismaClient } from "@prisma/client"
import { createCalendarDate } from "../../src/utils/calendar-date.js"
import { ColaboradorRepositoryPrisma } from "../../src/infrastructure/prisma/colaborador-repository-prisma.js"

describe.skip("ColaboradorRepositoryPrisma (integração — requer PostgreSQL real)", () => {
  const prisma = new PrismaClient()
  const repository = new ColaboradorRepositoryPrisma(prisma)

  beforeEach(async () => {
    await prisma.agendamento.deleteMany()
    await prisma.colaborador.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("cria um colaborador e persiste os dados corretamente", async () => {
    const colaborador = await repository.criar({
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    expect(colaborador.id).toBeGreaterThan(0)
    expect(colaborador.nome).toBe("Ana")
  })

  it("busca um colaborador pelo id, com salário preservando centavos exatos", async () => {
    const criado = await repository.criar({
      nome: "Bruno",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350050n, // R$ 3.500,50 — testa centavos não-zero
    })

    const encontrado = await repository.buscarPorId(criado.id)

    expect(encontrado?.salarioCentavos).toBe(350050n)
  })

  it("busca um colaborador pelo id, com data de admissão preservando YYYY-MM-DD sem deslocamento", async () => {
    const criado = await repository.criar({
      nome: "Carla",
      dataAdmissao: createCalendarDate(2024, 2, 29), // ano bissexto, caso de borda
      salarioCentavos: 350000n,
    })

    const encontrado = await repository.buscarPorId(criado.id)

    expect(encontrado?.dataAdmissao).toEqual({ year: 2024, month: 2, day: 29 })
  })

  it("retorna null ao buscar um colaborador inexistente", async () => {
    const encontrado = await repository.buscarPorId(999999)
    expect(encontrado).toBeNull()
  })
})
