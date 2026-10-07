import { useCallback, useEffect, useState } from "react"
import { consultarPeriodos } from "../api/colaboradores.js"
import type { Periodo } from "../types/api.js"

export interface UsePeriodosResultado {
  readonly periodos: Periodo[]
  readonly carregando: boolean
  readonly erro: string | null
  readonly recarregar: () => void
}

/**
 * Carrega os períodos/saldo de um colaborador (GET
 * /colaboradores/:id/periodos). `colaboradorId` nulo significa
 * "nenhum colaborador selecionado ainda" — nesse caso não faz
 * nenhuma requisição.
 */
export function usePeriodos(colaboradorId: number | null): UsePeriodosResultado {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    if (colaboradorId === null) {
      setPeriodos([])
      setErro(null)
      return
    }

    let ativo = true
    setCarregando(true)
    setErro(null)

    consultarPeriodos(colaboradorId)
      .then((resposta) => {
        if (ativo) setPeriodos(resposta.periodos)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar períodos.")
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [colaboradorId, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  return { periodos, carregando, erro, recarregar }
}
