// Mapeamento de erros de domínio/aplicação/HTTP para respostas HTTP
// consistentes.
//
// Conforme CLAUDE.md, seção "7. Tratamento de erros": toda rejeição por
// regra de negócio deve expor o código da regra (R1-R7) e uma mensagem
// amigável, sem detalhes técnicos. Erros inesperados (5xx) nunca expõem
// stack trace nem detalhes internos do Prisma.
//
// Mapeamento de status HTTP (decisão desta etapa, documentada no
// relatório desta etapa e, se necessário, no PLAN.md):
//   - `EntradaHttpInvalidaError` / `EntradaInvalidaError` → 400 (Bad
//     Request): a entrada em si é estruturalmente inválida (formato,
//     tipo, campo ausente) — não chegou a ser avaliada por nenhuma
//     regra de negócio.
//   - `RecursoNaoEncontradoError` → 404 (Not Found): colaborador ou
//     agendamento inexistente.
//   - `ConflitoDeEstadoError` → 409 (Conflict): operação estruturalmente
//     válida, mas o estado atual do recurso impede (ex.: cancelar um
//     agendamento já cancelado).
//   - `RegraNegocioError` → 422 (Unprocessable Entity): a entrada é
//     bem formada, mas uma regra de negócio R1-R7 rejeita a operação.
//   - Corpo da requisição com JSON malformado (erro de parsing do
//     `express.json()`, antes de chegar a qualquer controller) → 400
//     (Bad Request), com mensagem genérica e segura — NUNCA a mensagem
//     original do parser (que pode incluir um trecho do body enviado).
//   - Qualquer outro erro (não esperado) → 500 (Internal Server Error),
//     com uma mensagem genérica — NUNCA a mensagem/stack do erro
//     original, para não vazar detalhes internos (ex.: erros do
//     Prisma/SQL).

import type { Response } from "express"
import { RegraNegocioError } from "../domain/regra-negocio-error.js"
import { ConflitoDeEstadoError, RecursoNaoEncontradoError } from "../application/erros.js"
import { EntradaInvalidaError } from "../application/criar-colaborador.js"
import { EntradaHttpInvalidaError } from "./serializacao.js"

export interface CorpoErroHttp {
  readonly error: {
    readonly code: string
    readonly message: string
  }
}

function corpoErro(code: string, message: string): CorpoErroHttp {
  return { error: { code, message } }
}

/**
 * Identifica o erro de parsing de JSON lançado pelo `express.json()`
 * (via `body-parser`) quando o corpo da requisição não é um JSON
 * válido. Esse erro é um `SyntaxError` com a propriedade `type` igual a
 * `"entity.parse.failed"` — verificado por execução real contra o
 * `express.json()` desta mesma versão do Express. Checar `type` (em
 * vez de `instanceof SyntaxError`) evita capturar, por engano, um
 * `SyntaxError` de outra origem (ex.: um bug real de código) como se
 * fosse entrada inválida do cliente.
 */
function ehErroDeParsingDeJson(erro: unknown): boolean {
  return (
    erro instanceof Error &&
    erro.name === "SyntaxError" &&
    (erro as { type?: unknown }).type === "entity.parse.failed"
  )
}

/**
 * Traduz qualquer erro capturado no tratamento de uma rota para uma
 * resposta HTTP, com status e corpo coerentes com o tipo do erro. Esta
 * é a ÚNICA função responsável por decidir o status HTTP a partir do
 * tipo do erro — os controllers não decidem isso individualmente.
 */
export function responderComErro(res: Response, erro: unknown): void {
  if (erro instanceof RegraNegocioError) {
    res.status(422).json(corpoErro(erro.codigo, erro.message))
    return
  }

  if (erro instanceof RecursoNaoEncontradoError) {
    res.status(404).json(corpoErro("NAO_ENCONTRADO", erro.message))
    return
  }

  if (erro instanceof ConflitoDeEstadoError) {
    res.status(409).json(corpoErro("CONFLITO", erro.message))
    return
  }

  if (erro instanceof EntradaInvalidaError || erro instanceof EntradaHttpInvalidaError) {
    res.status(400).json(corpoErro("ENTRADA_INVALIDA", erro.message))
    return
  }

  if (ehErroDeParsingDeJson(erro)) {
    res
      .status(400)
      .json(corpoErro("ENTRADA_INVALIDA", "O corpo da requisição não é um JSON válido."))
    return
  }

  // Erro inesperado: nunca expor a mensagem/stack original (pode conter
  // detalhes do Prisma/SQL ou outros detalhes internos). Status 500,
  // mensagem genérica.
  res.status(500).json(corpoErro("ERRO_INTERNO", "Ocorreu um erro inesperado. Tente novamente."))
}
