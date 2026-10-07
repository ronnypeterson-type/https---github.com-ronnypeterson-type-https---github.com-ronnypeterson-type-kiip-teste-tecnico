import "dotenv/config"
import { createApp } from "./app.js"
import { dependenciasHttp } from "./dependencias.js"

const port = Number(process.env.PORT) || 3001
const app = createApp(dependenciasHttp)

app.listen(port, () => {
  console.log(`API de controle de férias rodando na porta ${port}`)
})
