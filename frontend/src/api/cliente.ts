// Cliente HTTP mínimo para consumo da API REST do backend.
//
// A URL da API é configurada via variável de ambiente de build
// (VITE_API_URL), nunca via recursos proprietários da Brixly (ex.:
// "/_api") — o frontend deve conseguir falar com o backend de forma
// independente da plataforma Brixly (ver PLAN.md, seção 11).
//
// Responsabilidade estrita desta camada: fazer a chamada HTTP,
// decodificar a resposta JSON e traduzir falhas para os tipos de erro
// de `erroApi.ts`. Nenhuma regra de negócio, nenhum cálculo de saldo
// ou dinheiro, nenhuma validação de data — isso é tudo responsabilidade
// exclusiva do backend.

import type { ErroApi as ErroApiPayload } from "../types/api.js"
import { ErroApi, ErroDeRede } from "./erroApi.js"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

function ehErroApiPayload(valor: unknown): valor is ErroApiPayload {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "error" in valor &&
    typeof (valor as { error?: unknown }).error === "object"
  )
}

/**
 * Executa uma requisição HTTP contra a API e devolve o corpo já
 * decodificado como JSON. Lança `ErroApi` (com `code`/`message` exatos
 * da resposta) quando a API responde com um status de erro, ou
 * `ErroDeRede` quando a requisição falha antes de obter qualquer
 * resposta (API indisponível, DNS, CORS, etc.).
 */
export async function requisitar<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    })
  } catch {
    throw new ErroDeRede()
  }

  const data: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (ehErroApiPayload(data)) {
      throw new ErroApi(data.error.code, data.error.message)
    }
    throw new ErroApi("ERRO_INTERNO", "Ocorreu um erro inesperado. Tente novamente.")
  }

  return data as T
}
