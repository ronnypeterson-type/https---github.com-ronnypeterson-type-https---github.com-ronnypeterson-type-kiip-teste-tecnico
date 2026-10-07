import { describe, expect, it } from "vitest"
import request from "supertest"
import { criarAppDeTeste } from "./helpers/criar-app-de-teste.js"

// Todos os valores de data/dias abaixo foram verificados por execução
// real antes de serem fixados aqui. Colaborador admitido em
// 2023-01-10 está, na data real do sistema nesta sessão, no período
// aquisitivo 3 (concessivo: 2026-01-10 a 2027-01-09). 16/11/2026 e
// 17/11/2026 são dias úteis (segunda/terça) sem feriado próximo,
// válidos por R4.

async function criarColaboradorDeTeste(app: import("express").Express) {
  const resposta = await request(app).post("/colaboradores").send({
    nome: "Ana",
    dataAdmissao: "2023-01-10",
    salarioMensal: "3500.00",
  })
  return resposta.body.id as number
}

describe("POST /colaboradores/:id/ferias", () => {
  it("agenda férias válidas e retorna os valores R7 corretos", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const response = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      colaboradorId,
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      dataFim: "2026-11-29",
      quantidadeDias: 14,
      status: "ativo",
      valores: {
        remuneracao: "1633.33",
        tercoConstitucional: "544.44",
        total: "2177.77",
      },
    })
  })

  it("retorna 404 para colaborador inexistente", async () => {
    const { app } = criarAppDeTeste()

    const response = await request(app).post("/colaboradores/999/ferias").send({
      periodoNumero: 1,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe("NAO_ENCONTRADO")
  })

  it("rejeita por R2: data fora do período concessivo", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const response = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2025-06-01",
      quantidadeDias: 14,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe("R2")
  })

  it("rejeita por R3: fracionamento inviável (sobrariam 4 dias)", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    const response = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-12-14",
      quantidadeDias: 12,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe("R3")
  })

  it("rejeita por R4: data de início em domingo", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const response = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-15", // domingo (verificado)
      quantidadeDias: 5,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe("R4")
  })

  it("rejeita por R5: sobreposição com agendamento existente", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    const response = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-23",
      quantidadeDias: 5,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe("R5")
  })

  it("rejeita por R6: data de início não é futura", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const response = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-01-15",
      quantidadeDias: 14,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe("R6")
  })

  it("rejeita entrada HTTP inválida: quantidadeDias ausente", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const response = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("ENTRADA_INVALIDA")
  })
})

describe("DELETE /colaboradores/:id/ferias/:agendamentoId", () => {
  it("cancela um agendamento válido (cancelamento lógico)", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const criado = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    const response = await request(app).delete(
      `/colaboradores/${colaboradorId}/ferias/${criado.body.id}`,
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: criado.body.id, status: "cancelado" })
  })

  it("retorna 404 para agendamento inexistente", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const response = await request(app).delete(`/colaboradores/${colaboradorId}/ferias/999`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe("NAO_ENCONTRADO")
  })

  it("retorna 409 ao cancelar um agendamento já cancelado", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const criado = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    await request(app).delete(`/colaboradores/${colaboradorId}/ferias/${criado.body.id}`)

    const response = await request(app).delete(
      `/colaboradores/${colaboradorId}/ferias/${criado.body.id}`,
    )

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe("CONFLITO")
  })

  it("o cancelamento devolve os dias ao saldo disponível", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const criado = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    const periodosAntes = await request(app).get(`/colaboradores/${colaboradorId}/periodos`)
    const periodo3Antes = periodosAntes.body.periodos.find(
      (p: { periodoNumero: number }) => p.periodoNumero === 3,
    )
    expect(periodo3Antes.diasDisponiveis).toBe(16) // 30 - 14

    await request(app).delete(`/colaboradores/${colaboradorId}/ferias/${criado.body.id}`)

    const periodosDepois = await request(app).get(`/colaboradores/${colaboradorId}/periodos`)
    const periodo3Depois = periodosDepois.body.periodos.find(
      (p: { periodoNumero: number }) => p.periodoNumero === 3,
    )
    expect(periodo3Depois.diasDisponiveis).toBe(30)
    expect(periodo3Depois.diasAgendados).toBe(0)
  })
})

describe("GET /colaboradores/:id/ferias", () => {
  it("lista agendamentos com valores R7 e data final calculada", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    const response = await request(app).get(`/colaboradores/${colaboradorId}/ferias`)

    expect(response.status).toBe(200)
    expect(response.body.agendamentos).toHaveLength(1)
    expect(response.body.agendamentos[0]).toMatchObject({
      dataInicio: "2026-11-16",
      dataFim: "2026-11-29",
      quantidadeDias: 14,
      periodoNumero: 3,
      status: "ativo",
      valores: {
        remuneracao: "1633.33",
        tercoConstitucional: "544.44",
        total: "2177.77",
      },
    })
  })

  it("agendamentos cancelados permanecem identificáveis na listagem", async () => {
    const { app } = criarAppDeTeste()
    const colaboradorId = await criarColaboradorDeTeste(app)

    const criado = await request(app).post(`/colaboradores/${colaboradorId}/ferias`).send({
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })

    await request(app).delete(`/colaboradores/${colaboradorId}/ferias/${criado.body.id}`)

    const response = await request(app).get(`/colaboradores/${colaboradorId}/ferias`)

    expect(response.body.agendamentos).toHaveLength(1)
    expect(response.body.agendamentos[0].status).toBe("cancelado")
  })
})

describe("tratamento de erro inesperado (sem vazamento de detalhes internos)", () => {
  it("um erro não mapeado resulta em 500 com mensagem genérica, sem stack trace", async () => {
    const { app, colaboradorRepository } = criarAppDeTeste()

    // Força um erro inesperado substituindo o método por um que lança
    // um erro genérico (não um dos tipos tratados por responderComErro).
    colaboradorRepository.buscarPorId = async () => {
      throw new Error("falha interna simulada com detalhes sensíveis de banco")
    }

    const response = await request(app).get("/colaboradores/1/periodos")

    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe("ERRO_INTERNO")
    expect(response.body.error.message).not.toContain("falha interna simulada")
    expect(JSON.stringify(response.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/) // sem formato de stack trace
  })
})
