import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { Output } from "ddd-tool-kit";

import { VerifyRoundService } from "../../../src/application/services/verify-round/verify-round.service";
import { VerifyRoundController } from "../../../src/presentation/controllers/verify-round.controller";
import { bootTestApp, http } from "./helpers/make-app";

describe("VerifyRoundController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [VerifyRoundController],
      providers: [{ provide: VerifyRoundService, useValue: serviceMock }],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() => Promise.resolve(Output.success()));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("endpoint is public (no Authorization header required)", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.success({
          roundId: "round-1",
          serverSeed: "seed-xyz",
          seedHash: "a".repeat(64),
          crashPointScaled: 247,
          isValid: true,
        }),
      ),
    );
    const res = await http(baseUrl, "/rounds/round-1/verify");
    expect(res.status).toBe(200);
  });

  it("returns the verification DTO on success", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.success({
          roundId: "round-1",
          serverSeed: "seed-xyz",
          seedHash: "a".repeat(64),
          crashPointScaled: 552,
          isValid: true,
        }),
      ),
    );

    const res = await http(baseUrl, "/rounds/round-1/verify");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      roundId: "round-1",
      serverSeed: "seed-xyz",
      seedHash: "a".repeat(64),
      crashPointScaled: 552,
      isValid: true,
    });
    expect(serviceMock.execute).toHaveBeenCalledWith({ roundId: "round-1" });
  });

  it("returns 409 when the round has not crashed yet", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({
          message: "Round has not crashed yet — seed is not revealed.",
          statusCode: 409,
        }),
      ),
    );
    const res = await http(baseUrl, "/rounds/round-running/verify");
    expect(res.status).toBe(409);
  });

  it("returns 404 when the round does not exist", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "Round not found.", statusCode: 404 })),
    );
    const res = await http(baseUrl, "/rounds/nonexistent/verify");
    expect(res.status).toBe(404);
  });
});
