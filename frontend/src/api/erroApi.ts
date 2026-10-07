// Erro tipado que preserva o código e a mensagem exatos devolvidos
// pela API (ver backend/src/http/erros-http.ts), para que a camada de
// apresentação (componentes) nunca precise inventar uma mensagem —
// apenas exibir o que o backend já formatou como "amigável".
export class ErroApi extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "ErroApi"
    this.code = code
  }
}

/** Erro de rede/API indisponível — a requisição nem chegou a obter uma resposta HTTP. */
export class ErroDeRede extends Error {
  constructor() {
    super("Não foi possível conectar à API. Verifique sua conexão e tente novamente.")
    this.name = "ErroDeRede"
  }
}
