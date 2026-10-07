import { useState, type FormEvent } from "react"
import type { Periodo } from "../types/api.js"
import { ErroApi } from "../api/erroApi.js"

interface FormularioAgendamentoProps {
  readonly periodos: Periodo[]
  readonly enviando: boolean
  readonly erro: ErroApi | Error | null
  readonly sucesso: boolean
  readonly onAgendar: (dados: { periodoNumero: number; dataInicio: string; quantidadeDias: number }) => void
}

/**
 * Formulário de agendamento. Envia apenas a intenção do usuário
 * (periodoNumero, dataInicio, quantidadeDias) para a API — nenhuma
 * regra R1-R7 (domingo, feriado, saldo, fracionamento, sobreposição,
 * concessivo, remuneração) é verificada aqui. A validação local se
 * limita ao que o HTML/formulário já exige estruturalmente (campos
 * obrigatórios, número positivo) — a mesma natureza de validação que o
 * backend faz na borda HTTP, nunca a regra de negócio em si.
 */
export function FormularioAgendamento({
  periodos,
  enviando,
  erro,
  sucesso,
  onAgendar,
}: FormularioAgendamentoProps) {
  const [periodoNumero, setPeriodoNumero] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [quantidadeDias, setQuantidadeDias] = useState("")

  const desabilitado = enviando || periodos.length === 0

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!periodoNumero || !dataInicio || !quantidadeDias) {
      return
    }

    onAgendar({
      periodoNumero: Number(periodoNumero),
      dataInicio,
      quantidadeDias: Number(quantidadeDias),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <h3 className="text-h3">Agendar férias</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="periodo-numero" className="text-sm font-medium text-ink">
          Período aquisitivo
        </label>
        <select
          id="periodo-numero"
          className="min-h-[44px] w-full rounded-ui border border-line bg-surface px-3 text-base text-ink"
          value={periodoNumero}
          disabled={desabilitado}
          onChange={(e) => setPeriodoNumero(e.target.value)}
          required
        >
          <option value="">Selecione o período</option>
          {periodos.map((periodo) => (
            <option key={periodo.periodoNumero} value={periodo.periodoNumero}>
              {periodo.periodoNumero}º período ({periodo.diasDisponiveis} dias disponíveis)
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="data-inicio" className="text-sm font-medium text-ink">
          Data de início
        </label>
        <input
          id="data-inicio"
          type="date"
          className="min-h-[44px] w-full rounded-ui border border-line bg-surface px-3 text-base text-ink"
          value={dataInicio}
          disabled={desabilitado}
          onChange={(e) => setDataInicio(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="quantidade-dias" className="text-sm font-medium text-ink">
          Quantidade de dias
        </label>
        <input
          id="quantidade-dias"
          type="number"
          min={1}
          max={30}
          className="min-h-[44px] w-full rounded-ui border border-line bg-surface px-3 text-base text-ink"
          value={quantidadeDias}
          disabled={desabilitado}
          onChange={(e) => setQuantidadeDias(e.target.value)}
          required
        />
      </div>

      {erro && (
        <div role="alert" className="alert-danger">
          {erro instanceof ErroApi && (
            <p className="mb-1 font-semibold uppercase tracking-wide">{erro.code}</p>
          )}
          <p>{erro.message}</p>
        </div>
      )}

      {sucesso && (
        <p role="status" className="alert-success">
          Férias agendadas com sucesso.
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={desabilitado}>
        {enviando ? "Agendando…" : "Agendar férias"}
      </button>
    </form>
  )
}
