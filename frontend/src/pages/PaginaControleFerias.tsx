import { useState } from "react"
import { useColaboradores } from "../hooks/useColaboradores.js"
import { usePeriodos } from "../hooks/usePeriodos.js"
import { useAgendamentos } from "../hooks/useAgendamentos.js"
import { agendarFerias, cancelarAgendamento } from "../api/ferias.js"
import { SeletorColaborador } from "../components/SeletorColaborador.js"
import { ResumoSaldo } from "../components/ResumoSaldo.js"
import { ListaPeriodos } from "../components/ListaPeriodos.js"
import { FormularioAgendamento } from "../components/FormularioAgendamento.js"
import { ListaAgendamentos } from "../components/ListaAgendamentos.js"

export function PaginaControleFerias() {
  const [colaboradorId, setColaboradorId] = useState<number | null>(null)

  const colaboradoresInfo = useColaboradores()
  const periodosInfo = usePeriodos(colaboradorId)
  const agendamentosInfo = useAgendamentos(colaboradorId)

  const [enviandoAgendamento, setEnviandoAgendamento] = useState(false)
  const [erroAgendamento, setErroAgendamento] = useState<Error | null>(null)
  const [sucessoAgendamento, setSucessoAgendamento] = useState(false)

  const [cancelandoId, setCancelandoId] = useState<number | null>(null)
  const [erroCancelamento, setErroCancelamento] = useState<string | null>(null)

  function handleSelecionarColaborador(id: number | null) {
    setColaboradorId(id)
    setErroAgendamento(null)
    setSucessoAgendamento(false)
    setErroCancelamento(null)
  }

  async function handleAgendar(dados: { periodoNumero: number; dataInicio: string; quantidadeDias: number }) {
    if (colaboradorId === null || enviandoAgendamento) {
      return
    }

    setEnviandoAgendamento(true)
    setErroAgendamento(null)
    setSucessoAgendamento(false)

    try {
      await agendarFerias(colaboradorId, dados)
      setSucessoAgendamento(true)
      periodosInfo.recarregar()
      agendamentosInfo.recarregar()
    } catch (e) {
      setErroAgendamento(e instanceof Error ? e : new Error("Erro ao agendar férias."))
    } finally {
      setEnviandoAgendamento(false)
    }
  }

  async function handleCancelar(agendamentoId: number) {
    if (colaboradorId === null || cancelandoId !== null) {
      return
    }

    setCancelandoId(agendamentoId)
    setErroCancelamento(null)

    try {
      await cancelarAgendamento(colaboradorId, agendamentoId)
      periodosInfo.recarregar()
      agendamentosInfo.recarregar()
    } catch (e) {
      setErroCancelamento(e instanceof Error ? e.message : "Erro ao cancelar agendamento.")
    } finally {
      setCancelandoId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg pb-16">
      <header className="wrap flex flex-col gap-1 pt-10 pb-6">
        <p className="eyebrow">Recursos Humanos</p>
        <h1 className="font-display text-h1 text-ink">Controle de Férias</h1>
        <p className="text-lead text-muted">
          Consulte saldos, agende e cancele períodos de férias dos colaboradores.
        </p>
      </header>

      <div className="wrap flex flex-col gap-8">
        <SeletorColaborador
          colaboradores={colaboradoresInfo.colaboradores}
          colaboradorId={colaboradorId}
          carregando={colaboradoresInfo.carregando}
          erro={colaboradoresInfo.erro}
          onSelecionar={handleSelecionarColaborador}
        />

        {colaboradorId === null ? (
          <p className="text-muted">Selecione um colaborador acima para ver o saldo de férias.</p>
        ) : (
          <>
            <section aria-labelledby="titulo-resumo" className="flex flex-col gap-4">
              <h2 id="titulo-resumo" className="text-h2">
                Resumo
              </h2>
              <ResumoSaldo periodos={periodosInfo.periodos} />
            </section>

            <section aria-labelledby="titulo-periodos" className="flex flex-col gap-4">
              <h2 id="titulo-periodos" className="text-h2">
                Períodos
              </h2>
              <ListaPeriodos
                periodos={periodosInfo.periodos}
                carregando={periodosInfo.carregando}
                erro={periodosInfo.erro}
              />
            </section>

            <section aria-labelledby="titulo-agendamento" className="flex flex-col gap-4">
              <h2 id="titulo-agendamento" className="text-h2">
                Novo agendamento
              </h2>
              <FormularioAgendamento
                periodos={periodosInfo.periodos}
                enviando={enviandoAgendamento}
                erro={erroAgendamento}
                sucesso={sucessoAgendamento}
                onAgendar={handleAgendar}
              />
            </section>

            <section aria-labelledby="titulo-lista-agendamentos" className="flex flex-col gap-4">
              <h2 id="titulo-lista-agendamentos" className="text-h2">
                Agendamentos
              </h2>
              <ListaAgendamentos
                agendamentos={agendamentosInfo.agendamentos}
                carregando={agendamentosInfo.carregando}
                erro={agendamentosInfo.erro}
                cancelandoId={cancelandoId}
                erroCancelamento={erroCancelamento}
                onCancelar={handleCancelar}
              />
            </section>
          </>
        )}
      </div>
    </main>
  )
}
