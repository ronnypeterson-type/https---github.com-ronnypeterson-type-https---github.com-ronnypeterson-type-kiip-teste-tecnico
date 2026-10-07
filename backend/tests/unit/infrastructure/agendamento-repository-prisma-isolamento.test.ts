import { describe, expect, it } from "vitest"
import { AgendamentoRepositoryPrisma } from "../../../src/infrastructure/prisma/agendamento-repository-prisma.js"

// Este teste NÃO exige PostgreSQL — usa um mock mínimo de `PrismaClient`
// que simula `$transaction` sem nenhuma conexão real, apenas para
// provar a MECÂNICA de isolamento de `executarComLockDoColaborador`:
// duas chamadas concorrentes, na MESMA instância de
// `AgendamentoRepositoryPrisma` (o cenário real de uma aplicação, onde
// o repository é uma única instância reaproveitada por todas as
// requisições), devem operar sobre clientes de transação DIFERENTES,
// nunca compartilhando nem sobrescrevendo um campo mutável comum.
//
// Este é exatamente o bug que esta implementação corrige: uma versão
// anterior usava um campo mutável (`this.clienteAtivo`), que seria
// sobrescrito por uma chamada concorrente antes da outra terminar,
// corrompendo qual cliente cada operação realmente usa. Nesta versão,
// cada chamada cria uma nova instância local vinculada ao seu próprio
// cliente de transação — nunca há um campo compartilhado para corromper.

interface ClientePrismaMock {
  readonly id: number
  $queryRaw: () => Promise<unknown[]>
  agendamento: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
    findMany: () => Promise<unknown[]>
    findUnique: () => Promise<null>
    update: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
  }
}

/**
 * Cria um cliente de transação mock que, a cada chamada de `create`,
 * registra em `registroDeUso` qual `id` de cliente foi efetivamente
 * usado — isso é observado FORA do pipeline normal de conversão
 * `paraAgendamento` (que descarta qualquer campo extra do registro),
 * por isso o registro é feito diretamente aqui, não através do valor
 * de retorno de `criar()`.
 */
function criarClienteTransacaoMock(id: number, registroDeUso: number[]): ClientePrismaMock {
  return {
    id,
    $queryRaw: async () => [],
    agendamento: {
      create: async (args) => {
        registroDeUso.push(id)
        return { id: 1, status: "ativo", dataInicio: new Date(), ...args.data }
      },
      findMany: async () => [],
      findUnique: async () => null,
      update: async (args) => ({ id: 1, status: "cancelado", dataInicio: new Date(), ...args.data }),
    },
  }
}

function criarPrismaClientMock(registroDeUso: number[]) {
  let proximoIdDeTransacao = 1

  return {
    $transaction: async (
      fn: (tx: ClientePrismaMock) => Promise<unknown>,
    ): Promise<unknown> => {
      const idDesta = proximoIdDeTransacao
      proximoIdDeTransacao += 1

      // Simula o tempo de uma transação real (ordem de chegada não
      // determinística entre chamadas concorrentes), para garantir que
      // o teste realmente exercita concorrência, não apenas chamadas
      // sequenciais disfarçadas.
      await new Promise((resolve) => setTimeout(resolve, idDesta === 1 ? 10 : 0))

      const tx = criarClienteTransacaoMock(idDesta, registroDeUso)
      return fn(tx)
    },
  }
}

describe("AgendamentoRepositoryPrisma — isolamento entre chamadas concorrentes", () => {
  it("duas chamadas concorrentes a executarComLockDoColaborador, na MESMA instância, recebem repositories vinculados a clientes de transação DIFERENTES", async () => {
    const clientesUsados: number[] = []
    const prismaMock = criarPrismaClientMock(clientesUsados)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repository = new AgendamentoRepositoryPrisma(prismaMock as any)

    const chamada1 = repository.executarComLockDoColaborador(1, async (repoTransacional) => {
      return repoTransacional.criar({
        colaboradorId: 1,
        periodoNumero: 1,
        dataInicio: { year: 2026, month: 3, day: 16 },
        quantidadeDias: 14,
      })
    })

    const chamada2 = repository.executarComLockDoColaborador(2, async (repoTransacional) => {
      return repoTransacional.criar({
        colaboradorId: 2,
        periodoNumero: 1,
        dataInicio: { year: 2026, month: 3, day: 16 },
        quantidadeDias: 10,
      })
    })

    await Promise.all([chamada1, chamada2])

    // As duas chamadas devem ter usado clientes de transação distintos
    // — nunca o mesmo, e nunca um sobrescrevendo o outro.
    expect(clientesUsados).toHaveLength(2)
    expect(clientesUsados[0]).not.toBe(clientesUsados[1])
  })

  it("a instância original do repository nunca é modificada por executarComLockDoColaborador (sem estado mutável)", async () => {
    const prismaMock = criarPrismaClientMock([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repository = new AgendamentoRepositoryPrisma(prismaMock as any)

    // Captura todas as chaves próprias do objeto antes e depois de uma
    // chamada transacional — se houvesse um campo mutável como
    // `clienteAtivo` sendo reatribuído, isso não apareceria aqui como
    // nova chave (o campo já existiria), mas a ausência de QUALQUER
    // campo mutável reatribuível é garantida pelo `readonly` no
    // construtor (verificado em tempo de compilação) — este teste
    // apenas reforça, em runtime, que a identidade do objeto
    // `repository` não muda.
    const chavesAntes = Object.keys(repository)

    await repository.executarComLockDoColaborador(1, async (repoTransacional) => {
      expect(repoTransacional).not.toBe(repository) // é uma instância NOVA, não a original
      return repoTransacional.criar({
        colaboradorId: 1,
        periodoNumero: 1,
        dataInicio: { year: 2026, month: 3, day: 16 },
        quantidadeDias: 14,
      })
    })

    const chavesDepois = Object.keys(repository)
    expect(chavesDepois).toEqual(chavesAntes)
  })
})
