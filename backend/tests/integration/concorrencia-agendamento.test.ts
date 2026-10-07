// Teste de CONCORRÊNCIA: duas tentativas simultâneas de agendamento
// para o MESMO colaborador, que juntas violariam R3 (fracionamento) se
// não houvesse serialização via `SELECT ... FOR UPDATE`.
//
// IMPORTANTE — status de execução real: este teste NUNCA foi executado
// contra um PostgreSQL real nesta sessão (este ambiente não possui
// PostgreSQL disponível — confirmado por verificação direta no início
// deste bloco de trabalho). Está marcado com `describe.skip`.
//
// Este teste SÓ tem sentido contra um banco real: com os repositories
// fake (em memória, single-threaded, sem race condition real de I/O),
// não há concorrência genuína para demonstrar — por isso não foi
// escrito como teste unitário com fakes, apenas como teste de
// integração pendente de validação externa.
//
// Cenário: colaborador com período aquisitivo de 30 dias disponíveis.
// Duas requisições concorrentes tentam agendar 20 dias cada uma
// (20 + 20 = 40 > 30, violaria R3/o limite do aquisitivo se ambas
// lessem o mesmo estado "0 dias consumidos" antes de qualquer uma
// escrever). Com o lock `FOR UPDATE` na linha do colaborador
// (implementado em `AgendamentoRepositoryPrisma.executarComLockDoColaborador`),
// a segunda transação só começa a ler o estado de agendamentos ATIVOS
// depois que a primeira já fez commit — portanto a segunda tentativa
// deve ser corretamente REJEITADA por R3 (saldo insuficiente), nunca
// as duas serem aceitas simultaneamente.
//
// Para executar este teste quando houver PostgreSQL disponível: seguir
// as mesmas instruções dos demais arquivos em `tests/integration/`, e
// remover `.skip` abaixo.
//
// Nota sobre a implementação corrigida: `executarComLockDoColaborador`
// não usa mais um campo mutável de "cliente ativo" na instância de
// `AgendamentoRepositoryPrisma` — ele cria uma nova instância vinculada
// ao cliente de transação e a passa como argumento ao callback. Isso é
// relevante para este teste porque as duas chamadas de `agendarFerias`
// abaixo compartilham a MESMA instância de `deps.agendamentoRepository`
// (criada uma única vez, fora do `it`) — exatamente o cenário de uma
// aplicação real, onde o repository é uma instância única reaproveitada
// por todas as requisições. Ver `tests/unit/infrastructure/
// agendamento-repository-prisma-isolamento.test.ts` para uma prova,
// sem precisar de Postgres real, de que chamadas concorrentes nunca
// compartilham o cliente de transação uma da outra.

import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { PrismaClient } from "@prisma/client"
import { createCalendarDate } from "../../src/utils/calendar-date.js"
import { criarRepositoriesPrisma } from "../../src/infrastructure/prisma/index.js"
import { criarColaborador } from "../../src/application/criar-colaborador.js"
import { agendarFerias } from "../../src/application/agendar-ferias.js"

const HOJE = createCalendarDate(2026, 1, 1)

describe.skip("Concorrência no agendamento (integração — requer PostgreSQL real)", () => {
  const prisma = new PrismaClient()
  const deps = criarRepositoriesPrisma(prisma)

  beforeEach(async () => {
    await prisma.agendamento.deleteMany()
    await prisma.colaborador.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("duas tentativas concorrentes de 20+20 dias no mesmo período: exatamente uma é aceita, a outra é rejeitada por R3", async () => {
    const colaborador = await criarColaborador(deps, {
      nome: "Ana",
      dataAdmissao: createCalendarDate(2025, 3, 15),
      salarioCentavos: 350000n,
    })

    const entradaComum = {
      colaboradorId: colaborador.id,
      periodoNumero: 1,
      quantidadeDias: 20,
    }

    const resultados = await Promise.allSettled([
      agendarFerias(
        deps,
        { ...entradaComum, dataInicio: createCalendarDate(2026, 3, 16) },
        HOJE,
      ),
      agendarFerias(
        deps,
        { ...entradaComum, dataInicio: createCalendarDate(2026, 6, 16) }, // data diferente, para não cair em R5 antes de testar R3
        HOJE,
      ),
    ])

    const sucesso = resultados.filter((r) => r.status === "fulfilled")
    const falha = resultados.filter((r) => r.status === "rejected")

    // Exatamente uma das duas deve ter sido aceita, e a outra rejeitada
    // (por R3 — saldo insuficiente, já que a primeira a commitar
    // consumiu 20 dos 30 dias disponíveis, sobrando 10, insuficientes
    // para outro período de 20 dias).
    expect(sucesso).toHaveLength(1)
    expect(falha).toHaveLength(1)

    const motivoFalha = (falha[0] as PromiseRejectedResult).reason
    expect(motivoFalha.codigo).toBe("R3")

    // Confirma que apenas um agendamento ativo de 20 dias existe no
    // banco — nunca os dois simultaneamente.
    const ativos = await deps.agendamentoRepository.listarAtivosPorColaborador(colaborador.id)
    expect(ativos).toHaveLength(1)
    expect(ativos[0].quantidadeDias).toBe(20)
  })
})
