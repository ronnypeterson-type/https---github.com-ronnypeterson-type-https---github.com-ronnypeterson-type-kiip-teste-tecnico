import { useCallback, useEffect, useState } from "react"
import { listarAgendamentos } from "../api/ferias.js"
import type { Agendamento } from "../types/api.js"

export interface UseAgendamentosResultado {
  readonly agendamentos: Agendamento[]
  readonly carregando: boolean
  readonly erro: string | null
  readonly recarregar: () => void
}

/** Carrega os agendamentos de um colaborador (GET /colaboradores/:id/ferias), incluindo cancelados. */
export function useAgendamentos(colaboradorId: number | null): UseAgendamentosResultado {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    if (colaboradorId === null) {
      setAgendamentos([])
      setErro(null)
      return
    }

    let ativo = true
    setCarregando(true)
    setErro(null)

    listarAgendamentos(colaboradorId)
      .then((resposta) => {
        if (ativo) setAgendamentos(resposta.agendamentos)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar agendamentos.")
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [colaboradorId, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  return { agendamentos, carregando, erro, recarregar }
}
