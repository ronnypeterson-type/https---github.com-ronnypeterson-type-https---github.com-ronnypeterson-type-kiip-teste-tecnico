import { Router } from "express"

export const healthRouter = Router()

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "controle-ferias-backend",
    timestamp: new Date().toISOString(),
  })
})
