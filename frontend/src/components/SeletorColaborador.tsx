import type { Colaborador } from "../types/api.js"

interface SeletorColaboradorProps {
  readonly colaboradores: Colaborador[]
  readonly colaboradorId: number | null
  readonly carregando: boolean
  readonly erro: string | null
  readonly onSelecionar: (colaboradorId: number | null) => void
}

/**
 * Seleção de um colaborador já existente. Não existe, propositalmente,
 * nenhuma opção de "criar novo colaborador" aqui — a criação é
 * exclusivamente via API (ver PLAN.md).
 */
export function SeletorColaborador({
  colaboradores,
  colaboradorId,
  carregando,
  erro,
  onSelecionar,
}: SeletorColaboradorProps) {
  return (
    <div className="card flex flex-col gap-3">
      <label htmlFor="seletor-colaborador" className="text-h3">
        Colaborador
      </label>

      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}

      {!erro && !carregando && colaboradores.length === 0 && (
        <p className="text-muted">
          Nenhum colaborador cadastrado ainda. Cadastre um colaborador pela API (
          <code>POST /colaboradores</code>) para começar.
        </p>
      )}

      <select
        id="seletor-colaborador"
        className="min-h-[44px] w-full rounded-ui border border-line bg-surface px-3 text-base text-ink disabled:opacity-60"
        value={colaboradorId ?? ""}
        disabled={carregando || colaboradores.length === 0}
        onChange={(e) => {
          const valor = e.target.value
          onSelecionar(valor === "" ? null : Number(valor))
        }}
      >
        <option value="">{carregando ? "Carregando colaboradores…" : "Selecione um colaborador"}</option>
        {colaboradores.map((colaborador) => (
          <option key={colaborador.id} value={colaborador.id}>
            {colaborador.nome}
          </option>
        ))}
      </select>
    </div>
  )
}
