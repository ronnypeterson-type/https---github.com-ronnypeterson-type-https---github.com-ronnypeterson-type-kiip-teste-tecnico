import { useCallback, useEffect, useState } from "react"
import { listarColaboradores } from "../api/colaboradores.js"
import type { Colaborador } from "../types/api.js"

export interface UseColaboradoresResultado {
  readonly colaboradores: Colaborador[]
  readonly carregando: boolean
  readonly erro: string | null
  readonly recarregar: () => void
}

/** Carrega a lista de colaboradores existentes (GET /colaboradores), uma única vez ao montar. */
export function useColaboradores(): UseColaboradoresResultado {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)

    listarColaboradores()
      .then((resposta) => {
        if (ativo) setColaboradores(resposta.colaboradores)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar colaboradores.")
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  return { colaboradores, carregando, erro, recarregar }
}
