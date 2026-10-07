import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PaginaControleFerias } from "./PaginaControleFerias.js"
import * as apiColaboradores from "../api/colaboradores.js"
import * as apiFerias from "../api/ferias.js"
import { ErroApi } from "../api/erroApi.js"
import type { Agendamento, Colaborador, Periodo } from "../types/api.js"

// Testes de comportamento observável pelo usuário: o que aparece na
// tela depois de cada interação, não detalhes internos dos
// componentes. A camada HTTP (`src/api/*`) é mockada aqui
// explicitamente — a integração HTTP real já é exercida pelos testes
// Supertest do backend (Bloco 4) e pelo próprio `cliente.test.ts`
// (que mocka só `fetch`, não os módulos de API).

const colaboradorAna: Colaborador = {
  id: 1,
  nome: "Ana",
  dataAdmissao: "2023-01-10",
  salarioMensal: "3500.00",
}

const periodoVigente: Periodo = {
  periodoNumero: 3,
  aquisitivoInicio: "2025-01-10",
  aquisitivoFim: "2026-01-09",
  concessivoInicio: "2026-01-10",
  concessivoFim: "2027-01-09",
  diasAdquiridos: 30,
  diasAgendados: 0,
  diasDisponiveis: 30,
}

const agendamentoAtivo: Agendamento = {
  id: 1,
  colaboradorId: 1,
  periodoNumero: 3,
  dataInicio: "2026-11-16",
  dataFim: "2026-11-29",
  quantidadeDias: 14,
  status: "ativo",
  valores: { remuneracao: "1633.33", tercoConstitucional: "544.44", total: "2177.77" },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("PaginaControleFerias", () => {
  it("renderiza o estado inicial orientando a selecionar um colaborador", async () => {
    vi.spyOn(apiColaboradores, "listarColaboradores").mockResolvedValue({
      colaboradores: [colaboradorAna],
    })

    render(<PaginaControleFerias />)

    expect(screen.getByRole("heading", { name: /controle de férias/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument())
    expect(screen.getByText(/selecione um colaborador acima/i)).toBeInTheDocument()
  })

  it("ao selecionar um colaborador, carrega e exibe os períodos e o saldo", async () => {
    vi.spyOn(apiColaboradores, "listarColaboradores").mockResolvedValue({
      colaboradores: [colaboradorAna],
    })
    vi.spyOn(apiColaboradores, "consultarPeriodos").mockResolvedValue({
      periodos: [periodoVigente],
    })
    vi.spyOn(apiFerias, "listarAgendamentos").mockResolvedValue({ agendamentos: [] })

    const usuario = userEvent.setup()
    render(<PaginaControleFerias />)

    await waitFor(() => expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument())
    await usuario.selectOptions(screen.getByLabelText(/colaborador/i), "1")

    await waitFor(() => expect(screen.getAllByText("3º período").length).toBeGreaterThan(0))

    const secaoResumo = screen.getByRole("heading", { name: "Resumo" }).closest("section")!
    expect(within(secaoResumo).getByText("30 dias")).toBeInTheDocument()
    expect(apiColaboradores.consultarPeriodos).toHaveBeenCalledWith(1)
  })

  it("preenche o formulário e agenda férias com sucesso, atualizando os dados", async () => {
    vi.spyOn(apiColaboradores, "listarColaboradores").mockResolvedValue({
      colaboradores: [colaboradorAna],
    })
    vi.spyOn(apiColaboradores, "consultarPeriodos").mockResolvedValue({
      periodos: [periodoVigente],
    })
    vi.spyOn(apiFerias, "listarAgendamentos").mockResolvedValue({ agendamentos: [] })
    const agendarMock = vi.spyOn(apiFerias, "agendarFerias").mockResolvedValue(agendamentoAtivo)

    const usuario = userEvent.setup()
    render(<PaginaControleFerias />)

    await waitFor(() => expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument())
    await usuario.selectOptions(screen.getByLabelText(/colaborador/i), "1")
    await waitFor(() => expect(screen.getAllByText("3º período").length).toBeGreaterThan(0))

    await usuario.selectOptions(screen.getByLabelText(/período aquisitivo/i), "3")
    await usuario.type(screen.getByLabelText(/data de início/i), "2026-11-16")
    await usuario.type(screen.getByLabelText(/quantidade de dias/i), "14")
    await usuario.click(screen.getByRole("button", { name: /agendar férias/i }))

    await waitFor(() =>
      expect(screen.getByText(/férias agendadas com sucesso/i)).toBeInTheDocument(),
    )
    expect(agendarMock).toHaveBeenCalledWith(1, {
      periodoNumero: 3,
      dataInicio: "2026-11-16",
      quantidadeDias: 14,
    })
  })

  it("exibe o código e a mensagem exatos de uma rejeição de regra de negócio (ex.: R6)", async () => {
    vi.spyOn(apiColaboradores, "listarColaboradores").mockResolvedValue({
      colaboradores: [colaboradorAna],
    })
    vi.spyOn(apiColaboradores, "consultarPeriodos").mockResolvedValue({
      periodos: [periodoVigente],
    })
    vi.spyOn(apiFerias, "listarAgendamentos").mockResolvedValue({ agendamentos: [] })
    vi.spyOn(apiFerias, "agendarFerias").mockRejectedValue(
      new ErroApi("R6", "As férias só podem ser agendadas para uma data de início posterior a hoje."),
    )

    const usuario = userEvent.setup()
    render(<PaginaControleFerias />)

    await waitFor(() => expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument())
    await usuario.selectOptions(screen.getByLabelText(/colaborador/i), "1")
    await waitFor(() => expect(screen.getAllByText("3º período").length).toBeGreaterThan(0))

    await usuario.selectOptions(screen.getByLabelText(/período aquisitivo/i), "3")
    await usuario.type(screen.getByLabelText(/data de início/i), "2026-01-15")
    await usuario.type(screen.getByLabelText(/quantidade de dias/i), "14")
    await usuario.click(screen.getByRole("button", { name: /agendar férias/i }))

    await waitFor(() => expect(screen.getByText("R6")).toBeInTheDocument())
    expect(
      screen.getByText(/data de início posterior a hoje/i),
    ).toBeInTheDocument()
    // Não deve ter criado nenhum agendamento na lista após a rejeição.
    expect(screen.getByText(/nenhum agendamento de férias ainda/i)).toBeInTheDocument()
  })

  it("lista agendamentos existentes com valores financeiros formatados em reais", async () => {
    vi.spyOn(apiColaboradores, "listarColaboradores").mockResolvedValue({
      colaboradores: [colaboradorAna],
    })
    vi.spyOn(apiColaboradores, "consultarPeriodos").mockResolvedValue({
      periodos: [{ ...periodoVigente, diasAgendados: 14, diasDisponiveis: 16 }],
    })
    vi.spyOn(apiFerias, "listarAgendamentos").mockResolvedValue({
      agendamentos: [agendamentoAtivo],
    })

    const usuario = userEvent.setup()
    render(<PaginaControleFerias />)

    await waitFor(() => expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument())
    await usuario.selectOptions(screen.getByLabelText(/colaborador/i), "1")

    await waitFor(() => expect(screen.getByText("16/11/2026 – 29/11/2026")).toBeInTheDocument())
    expect(screen.getByText(/R\$ 1\.633,33/)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 544,44/)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 2\.177,77/)).toBeInTheDocument()
    expect(screen.getByText("Ativo")).toBeInTheDocument()
  })

  it("cancela um agendamento após confirmação e atualiza a lista/saldo", async () => {
    vi.spyOn(apiColaboradores, "listarColaboradores").mockResolvedValue({
      colaboradores: [colaboradorAna],
    })
    const consultarPeriodosMock = vi
      .spyOn(apiColaboradores, "consultarPeriodos")
      .mockResolvedValueOnce({ periodos: [{ ...periodoVigente, diasAgendados: 14, diasDisponiveis: 16 }] })
      .mockResolvedValueOnce({ periodos: [periodoVigente] })
    vi.spyOn(apiFerias, "listarAgendamentos")
      .mockResolvedValueOnce({ agendamentos: [agendamentoAtivo] })
      .mockResolvedValueOnce({ agendamentos: [{ ...agendamentoAtivo, status: "cancelado" }] })
    const cancelarMock = vi
      .spyOn(apiFerias, "cancelarAgendamento")
      .mockResolvedValue({ id: 1, status: "cancelado" })

    const usuario = userEvent.setup()
    render(<PaginaControleFerias />)

    await waitFor(() => expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument())
    await usuario.selectOptions(screen.getByLabelText(/colaborador/i), "1")
    await waitFor(() => expect(screen.getByText("Ativo")).toBeInTheDocument())

    await usuario.click(screen.getByRole("button", { name: /cancelar/i }))
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }))

    await waitFor(() => expect(cancelarMock).toHaveBeenCalledWith(1, 1))
    await waitFor(() => expect(screen.getByText("Cancelado")).toBeInTheDocument())
    // O registro continua visível (não desaparece) e não oferece mais o botão cancelar.
    expect(screen.queryByRole("button", { name: /^cancelar$/i })).not.toBeInTheDocument()
    expect(consultarPeriodosMock).toHaveBeenCalledTimes(2) // recarregou o saldo após cancelar
  })

  it("exibe erro de API indisponível (erro de rede) ao carregar colaboradores", async () => {
    vi.spyOn(apiColaboradores, "listarColaboradores").mockRejectedValue(
      new Error("Não foi possível conectar à API. Verifique sua conexão e tente novamente."),
    )

    render(<PaginaControleFerias />)

    await waitFor(() =>
      expect(screen.getByText(/não foi possível conectar à api/i)).toBeInTheDocument(),
    )
  })

  it("exibe o estado de carregando colaboradores antes da resposta chegar", async () => {
    let resolver!: (value: { colaboradores: Colaborador[] }) => void
    vi.spyOn(apiColaboradores, "listarColaboradores").mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve
      }),
    )

    render(<PaginaControleFerias />)

    expect(screen.getByText(/carregando colaboradores/i)).toBeInTheDocument()

    resolver({ colaboradores: [colaboradorAna] })
    await waitFor(() => expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument())
  })
})
