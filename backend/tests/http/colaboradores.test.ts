import { describe, expect, it } from "vitest"
import request from "supertest"
import { criarAppDeTeste } from "./helpers/criar-app-de-teste.js"

describe("GET /colaboradores", () => {
  it("retorna lista vazia quando não há colaboradores cadastrados", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).get("/colaboradores")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ colaboradores: [] })
  })

  it("lista os colaboradores cadastrados, com os mesmos campos de POST /colaboradores", async () => {
    const { app } = criarAppDeTeste()

    await request(app).post("/colaboradores").send({
      nome: "Ana",
      dataAdmissao: "2023-01-10",
      salarioMensal: "3500.00",
    })
    await request(app).post("/colaboradores").send({
      nome: "Bruno",
      dataAdmissao: "2022-05-01",
      salarioMensal: "4200.00",
    })

    const response = await request(app).get("/colaboradores")

    expect(response.status).toBe(200)
    expect(response.body.colaboradores).toHaveLength(2)
    expect(response.body.colaboradores[0]).toEqual({
      id: 1,
      nome: "Ana",
      dataAdmissao: "2023-01-10",
      salarioMensal: "3500.00",
    })
    expect(response.body.colaboradores[1]).toMatchObject({ nome: "Bruno" })
  })
})

describe("POST /colaboradores", () => {
  it("cria um colaborador com dados válidos", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).post("/colaboradores").send({
      nome: "Ana",
      dataAdmissao: "2023-01-10",
      salarioMensal: "3500.00",
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      id: 1,
      nome: "Ana",
      dataAdmissao: "2023-01-10",
      salarioMensal: "3500.00",
    })
  })

  it("rejeita entrada inválida: nome ausente", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).post("/colaboradores").send({
      dataAdmissao: "2023-01-10",
      salarioMensal: "3500.00",
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("ENTRADA_INVALIDA")
  })

  it("rejeita entrada inválida: data de admissão em formato incorreto", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).post("/colaboradores").send({
      nome: "Ana",
      dataAdmissao: "10/01/2023",
      salarioMensal: "3500.00",
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("ENTRADA_INVALIDA")
  })

  it("rejeita entrada inválida: salário mal formatado", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).post("/colaboradores").send({
      nome: "Ana",
      dataAdmissao: "2023-01-10",
      salarioMensal: "não é número",
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("ENTRADA_INVALIDA")
  })

  it("preserva centavos exatos do salário na resposta (não usa number)", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).post("/colaboradores").send({
      nome: "Bruno",
      dataAdmissao: "2023-01-10",
      salarioMensal: "1000.05",
    })

    expect(response.status).toBe(201)
    expect(response.body.salarioMensal).toBe("1000.05")
  })

  it("retorna 400 (não 500) quando o corpo da requisição não é um JSON válido", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app)
      .post("/colaboradores")
      .set("Content-Type", "application/json")
      .send("{ isto não é JSON válido")

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("ENTRADA_INVALIDA")
    // Nunca expor a mensagem original do parser (pode conter um trecho
    // do body enviado) nem qualquer formato de stack trace.
    expect(response.body.error.message).not.toMatch(/unexpected token|json\.parse/i)
    expect(JSON.stringify(response.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/)
  })
})

describe("GET /colaboradores/:id/periodos", () => {
  it("consulta períodos de um colaborador existente", async () => {
    const { app } = criarAppDeTeste()

    const criado = await request(app).post("/colaboradores").send({
      nome: "Ana",
      dataAdmissao: "2023-01-10",
      salarioMensal: "3500.00",
    })

    const response = await request(app).get(`/colaboradores/${criado.body.id}/periodos`)

    expect(response.status).toBe(200)
    // Na data real do sistema (2026-10-07), o aquisitivo vigente é o 4º
    // (iniciado em 2026-01-10), então são retornados os períodos 1 a 4
    // (verificado por execução real em /tmp/check.ts).
    expect(response.body.periodos).toHaveLength(4)
    expect(response.body.periodos[0]).toMatchObject({
      periodoNumero: 1,
      aquisitivoInicio: "2023-01-10",
      aquisitivoFim: "2024-01-09",
      diasAdquiridos: 30,
      diasAgendados: 0,
      diasDisponiveis: 30,
    })
  })

  it("retorna 404 para colaborador inexistente", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).get("/colaboradores/999/periodos")

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe("NAO_ENCONTRADO")
  })

  it("rejeita id de rota inválido (não numérico)", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).get("/colaboradores/abc/periodos")

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("ENTRADA_INVALIDA")
  })
})
