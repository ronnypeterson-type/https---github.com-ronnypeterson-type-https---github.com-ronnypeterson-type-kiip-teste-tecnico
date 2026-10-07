import { describe, expect, it } from "vitest"
import request from "supertest"
import { createApp } from "../src/app.js"

describe("GET /health", () => {
  it("retorna status ok indicando que a API está no ar", async () => {
    const app = createApp()

    const response = await request(app).get("/health")

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      status: "ok",
      service: "controle-ferias-backend",
    })
  })
})
