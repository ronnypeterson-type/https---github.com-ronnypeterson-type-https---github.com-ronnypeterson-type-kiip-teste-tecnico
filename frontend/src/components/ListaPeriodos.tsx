import type { Periodo } from "../types/api.js"
import { formatarData } from "../utils/formatarData.js"

interface ListaPeriodosProps {
  readonly periodos: Periodo[]
  readonly carregando: boolean
  readonly erro: string | null
}

export function ListaPeriodos({ periodos, carregando, erro }: ListaPeriodosProps) {
  if (carregando) {
    return <p className="text-muted">Carregando períodos…</p>
  }

  if (erro) {
    return (
      <p role="alert" className="text-sm text-danger">
        {erro}
      </p>
    )
  }

  if (periodos.length === 0) {
    return <p className="text-muted">Selecione um colaborador para ver os períodos de férias.</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {periodos.map((periodo) => (
        <li key={periodo.periodoNumero} className="card flex flex-col gap-2">
          <p className="text-h3">{periodo.periodoNumero}º período</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
            <dt className="text-muted">Aquisitivo</dt>
            <dd className="text-ink">
              {formatarData(periodo.aquisitivoInicio)} – {formatarData(periodo.aquisitivoFim)}
            </dd>
            <dt className="text-muted">Concessivo</dt>
            <dd className="text-ink">
              {formatarData(periodo.concessivoInicio)} – {formatarData(periodo.concessivoFim)}
            </dd>
            <dt className="text-muted">Adquiridos</dt>
            <dd className="text-ink">{periodo.diasAdquiridos} dias</dd>
            <dt className="text-muted">Agendados</dt>
            <dd className="text-ink">{periodo.diasAgendados} dias</dd>
            <dt className="text-muted">Disponíveis</dt>
            <dd className="font-semibold text-ink">{periodo.diasDisponiveis} dias</dd>
          </dl>
        </li>
      ))}
    </ul>
  )
}
