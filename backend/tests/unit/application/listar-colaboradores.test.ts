import { describe, expect, it } from "vitest"
import { createCalendarDate } from "../../../src/utils/calendar-date.js"
import { ColaboradorRepositoryFake } from "../../../src/application/fakes/colaborador-repository-fake.js"
import { listarColaboradores } from "../../../src/application/listar-colaboradores.js"

describe("ListarColaboradores", () => {
  it("retorna lista vazia quando não há colaboradores cadastrados", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()

    const resultado = await listarColaboradores({ colaboradorRepository })

    expect(resultado).toEqual([])
  })

  it("retorna todos os colaboradores cadastrados", async () => {
    const colaboradorRepository = new ColaboradorRepositoryFake()
    await colaboradorRepository.criar({
      nome: "Ana",
      dataAdmissao: createCalendarDate(2023, 1, 10),
      salarioCentavos: 350000n,
    })
    await colaboradorRepository.criar({
      nome: "Bruno",
      dataAdmissao: createCalendarDate(2022, 5, 1),
      salarioCentavos: 420000n,
    })

    const resultado = await listarColaboradores({ colaboradorRepository })

    expect(resultado).toHaveLength(2)
    expect(resultado.map((c) => c.nome)).toEqual(["Ana", "Bruno"])
  })
})
