import { useState } from "react"
import type { Agendamento } from "../types/api.js"
import { formatarData } from "../utils/formatarData.js"
import { formatarMoeda } from "../utils/formatarMoeda.js"

interface ListaAgendamentosProps {
  readonly agendamentos: Agendamento[]
  readonly carregando: boolean
  readonly erro: string | null
  readonly cancelandoId: number | null
  readonly erroCancelamento: string | null
  readonly onCancelar: (agendamentoId: number) => void
}

/**
 * Lista de agendamentos (ativos e cancelados). O botão de cancelar só
 * aparece para agendamentos com status "ativo" — mas quem decide se o
 * cancelamento é de fato permitido (ex.: R6, data já passada) é
 * exclusivamente a API: este componente nunca reimplementa essa
 * decisão, apenas evita mostrar o botão para um registro que já está
 * cancelado (pois cancelar de novo não faria sentido).
 */
export function ListaAgendamentos({
  agendamentos,
  carregando,
  erro,
  cancelandoId,
  erroCancelamento,
  onCancelar,
}: ListaAgendamentosProps) {
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)

  if (carregando) {
    return <p className="text-muted">Carregando agendamentos…</p>
  }

  if (erro) {
    return (
      <p role="alert" className="text-sm text-danger">
        {erro}
      </p>
    )
  }

  if (agendamentos.length === 0) {
    return <p className="text-muted">Nenhum agendamento de férias ainda.</p>
  }

  return (
    <div className="overflow-x-auto">
      <ul className="flex flex-col gap-3">
        {agendamentos.map((agendamento) => {
          const ativo = agendamento.status === "ativo"
          const confirmando = confirmandoId === agendamento.id
          const cancelandoEste = cancelandoId === agendamento.id

          return (
            <li key={agendamento.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">
                    {formatarData(agendamento.dataInicio)} – {formatarData(agendamento.dataFim)}
                  </p>
                  <span className={ativo ? "badge-ativo" : "badge-cancelado"}>
                    {ativo ? "Ativo" : "Cancelado"}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {agendamento.periodoNumero}º período · {agendamento.quantidadeDias} dias
                </p>
                <p className="text-sm text-ink">
                  Remuneração {formatarMoeda(agendamento.valores.remuneracao)} · Terço{" "}
                  {formatarMoeda(agendamento.valores.tercoConstitucional)} · Total{" "}
                  <span className="font-semibold">{formatarMoeda(agendamento.valores.total)}</span>
                </p>
                {cancelandoEste && erroCancelamento && (
                  <p role="alert" className="mt-1 text-sm text-danger">
                    {erroCancelamento}
                  </p>
                )}
              </div>

              {ativo && (
                <div className="flex shrink-0 gap-2">
                  {confirmando ? (
                    <>
                      <span className="self-center text-sm text-muted">Confirmar cancelamento?</span>
                      <button
                        type="button"
                        className="btn btn-ghost min-h-[40px] px-3 py-2 text-sm"
                        onClick={() => setConfirmandoId(null)}
                        disabled={cancelandoEste}
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger min-h-[40px] px-3 py-2 text-sm"
                        onClick={() => {
                          onCancelar(agendamento.id)
                          setConfirmandoId(null)
                        }}
                        disabled={cancelandoEste}
                      >
                        {cancelandoEste ? "Cancelando…" : "Confirmar"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost min-h-[40px] px-3 py-2 text-sm"
                      onClick={() => setConfirmandoId(agendamento.id)}
                      disabled={cancelandoId !== null}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
