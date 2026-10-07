import type { Periodo } from "../types/api.js"

interface ResumoSaldoProps {
  readonly periodos: Periodo[]
}

/**
 * Resumo com base no último período retornado pela API (o período
 * aquisitivo vigente — ver backend/EXEMPLOS_CURL.md: "períodos do 1º
 * até o aquisitivo vigente, inclusive"). Não faz nenhum cálculo de
 * saldo: apenas lê os campos já calculados pelo backend.
 */
export function ResumoSaldo({ periodos }: ResumoSaldoProps) {
  if (periodos.length === 0) {
    return null
  }

  const periodoVigente = periodos[periodos.length - 1]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="card">
        <p className="eyebrow">Período vigente</p>
        <p className="text-h3">{periodoVigente.periodoNumero}º período</p>
      </div>
      <div className="card">
        <p className="eyebrow">Dias disponíveis</p>
        <p className="text-h3">{periodoVigente.diasDisponiveis} dias</p>
      </div>
      <div className="card">
        <p className="eyebrow">Períodos aquisitivos</p>
        <p className="text-h3">{periodos.length}</p>
      </div>
    </div>
  )
}
