import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { Output } from "ddd-tool-kit";

import { GetCurrentRoundService } from "../../../src/application/services/get-current-round/get-current-round.service";
import { GetCurrentRoundController } from "../../../src/presentation/controllers/get-current-round.controller";
import { RoundResponseMapper } from "../../../src/presentation/mappers/round-response.mapper";
import { bootTestApp, http } from "./helpers/make-app";
import { buildRound } from "./helpers/round-factory";

describe("GetCurrentRoundController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success({ round: null }))) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [GetCurrentRoundController],
      providers: [
        { provide: GetCurrentRoundService, useValue: serviceMock },
        RoundResponseMapper,
      ],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() => Promise.resolve(Output.success({ round: null })));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is public (no auth required)", async () => {
    const res = await http(baseUrl, "/rounds/current");
    expect(res.status).toBe(200);
  });

  it("returns null when no round exists", async () => {
    const res = await http(baseUrl, "/rounds/current");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("");
  });

  it("returns the mapped round when one exists (BETTING_OPEN)", async () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    serviceMock.execute = mock(() => Promise.resolve(Output.success({ round })));

    const res = await http(baseUrl, "/rounds/current");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(round.id.value);
    expect(body.seedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.currentStatus).toBe("BETTING_OPEN");
    expect(body.serverSeed).toBeUndefined();
    expect(body.bets).toEqual([]);
  });

  it("exposes serverSeed only when the round has crashed", async () => {
    const round = buildRound({ status: "CRASHED" });
    serviceMock.execute = mock(() => Promise.resolve(Output.success({ round })));

    const res = await http(baseUrl, "/rounds/current");
    const body = await res.json();
    expect(body.currentStatus).toBe("CRASHED");
    expect(body.serverSeed).toBe(round.seed.value);
  });

  it("propagates service failure as Nest exception", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "boom", statusCode: 500 })),
    );
    const res = await http(baseUrl, "/rounds/current");
    expect(res.status).toBe(500);
  });
});
