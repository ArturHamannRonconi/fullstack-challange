import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { INestApplication } from "@nestjs/common";

import { HealthController } from "../../../src/presentation/controllers/health.controller";
import { bootTestApp, http } from "./helpers/make-app";

describe("HealthController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    ({ app, baseUrl } = await bootTestApp({
      controllers: [HealthController],
      providers: [],
    }));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("GET /health returns 200 without authentication", async () => {
    const res = await http(baseUrl, "/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", service: "wallets" });
  });

  it("GET /health accepts (but ignores) an Authorization header", async () => {
    const res = await http(baseUrl, "/health", {
      headers: { Authorization: "Bearer whatever" },
    });
    expect(res.status).toBe(200);
  });
});
