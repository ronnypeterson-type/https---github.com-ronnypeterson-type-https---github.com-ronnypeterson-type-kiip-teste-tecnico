import { afterEach, describe, expect, it, vi } from "vitest"
import { requisitar } from "./cliente.js"
import { ErroApi, ErroDeRede } from "./erroApi.js"

// Testa a camada `requisitar` isoladamente, mockando `fetch` global —
// aqui o mock é apropriado porque o objetivo é verificar a tradução
// resposta HTTP -> tipo de erro/dado, não a integração de ponta a
// ponta (essa é coberta pelos testes HTTP reais do backend, Bloco 4).

describe("requisitar", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("devolve o corpo JSON decodificado quando a resposta é bem-sucedida", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ colaboradores: [] }),
      }),
    )

    const resultado = await requisitar("/colaboradores")

    expect(resultado).toEqual({ colaboradores: [] })
  })

  it("lança ErroApi com code/message exatos quando a API responde com erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { code: "R6", message: "Data de início inválida." } }),
      }),
    )

    await expect(requisitar("/colaboradores/1/ferias")).rejects.toMatchObject({
      code: "R6",
      message: "Data de início inválida.",
    })
  })

  it("lança ErroApi (instância correta) em caso de erro da API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { code: "NAO_ENCONTRADO", message: "Colaborador não encontrado." } }),
      }),
    )

    await expect(requisitar("/colaboradores/999/periodos")).rejects.toBeInstanceOf(ErroApi)
  })

  it("lança ErroDeRede quando a requisição falha antes de obter resposta (API indisponível)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    )

    await expect(requisitar("/colaboradores")).rejects.toBeInstanceOf(ErroDeRede)
  })
})
