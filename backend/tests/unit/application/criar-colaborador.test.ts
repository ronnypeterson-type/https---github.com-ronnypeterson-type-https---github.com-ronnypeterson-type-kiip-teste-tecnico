import { describe, expect, it } from "vitest"
import { createCalendarDate } from "../../../src/utils/calendar-date.js"
import { ColaboradorRepositoryFake } from "../../../src/application/fakes/colaborador-repository-fake.js"
import { criarColaborador, EntradaInvalidaError } from "../../../src/application/criar-colaborador.js"

describe("CriarColaborador", () => {
  it("cria um colaborador com dados válidos", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()

    const colaborador = await criarColaborador(
      { colaboradorRepository },
      { nome: "Ana", dataAdmissao: createCalendarDate(2025, 3, 15), salarioCentavos: 350000n },
    )

    expect(colaborador.id).toBe(1)
    expect(colaborador.nome).toBe("Ana")
    expect(colaborador.salarioCentavos).toBe(350000n)
    expect(await colaboradorRepository.buscarPorId(1)).toEqual(colaborador)
  })

  it("rejeita entrada inválida: nome vazio", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()

    await expect(
      criarColaborador(
        { colaboradorRepository },
        { nome: "", dataAdmissao: createCalendarDate(2025, 3, 15), salarioCentavos: 350000n },
      ),
    ).rejects.toThrow(EntradaInvalidaError)
  })

  it("rejeita entrada inválida: salário zero ou negativo", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()

    await expect(
      criarColaborador(
        { colaboradorRepository },
        { nome: "Ana", dataAdmissao: createCalendarDate(2025, 3, 15), salarioCentavos: 0n },
      ),
    ).rejects.toThrow(EntradaInvalidaError)
  })
})
