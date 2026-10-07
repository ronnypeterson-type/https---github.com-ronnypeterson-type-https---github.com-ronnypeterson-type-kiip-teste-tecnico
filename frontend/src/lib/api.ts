// Cliente HTTP mínimo para consumo da API do backend deste projeto.
// A URL da API é configurada via variável de ambiente de build (VITE_API_URL),
// nunca via recursos proprietários da Brixly (ex.: "/_api").

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Erro ao comunicar com a API")
  }

  return data as T
}
