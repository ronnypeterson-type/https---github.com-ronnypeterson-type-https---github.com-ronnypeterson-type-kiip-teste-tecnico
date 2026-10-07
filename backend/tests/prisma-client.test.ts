import { describe, expect, it } from "vitest"
import { prisma } from "../src/repositories/prisma.js"

// Este teste valida apenas a configuração estática do Prisma Client
// (geração correta a partir do schema). Não conecta a um banco real —
// nenhuma query é executada, apenas a inspeção da API gerada.
describe("Prisma Client", () => {
  it("é instanciado sem lançar erro na configuração mínima", () => {
    expect(prisma).toBeTruthy()
    expect(typeof prisma.$connect).toBe("function")
    expect(typeof prisma.$disconnect).toBe("function")
  })

  it("expõe os modelos colaborador e agendamento definidos no schema", () => {
    expect(prisma.colaborador).toBeDefined()
    expect(prisma.agendamento).toBeDefined()
  })

  it("expõe os métodos de consulta esperados para cada modelo", () => {
    expect(typeof prisma.colaborador.create).toBe("function")
    expect(typeof prisma.colaborador.findMany).toBe("function")
    expect(typeof prisma.agendamento.create).toBe("function")
    expect(typeof prisma.agendamento.findMany).toBe("function")
    expect(typeof prisma.agendamento.update).toBe("function")
  })
})
