import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { Output } from "ddd-tool-kit";

import { GetMyBetsService } from "../../../src/application/services/get-my-bets/get-my-bets.service";
import { GetMyBetsController } from "../../../src/presentation/controllers/get-my-bets.controller";
import { TEST_USER, bearer, bootTestApp, http } from "./helpers/make-app";
import { buildRound, makeBet } from "./helpers/round-factory";

describe("GetMyBetsController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = {
      execute: mock(() =>
        Promise.resolve(Output.success({ items: [], total: 0, page: 1, perPage: 20 })),
      ),
    };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [GetMyBetsController],
      providers: [{ provide: GetMyBetsService, useValue: serviceMock }],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.success({ items: [], total: 0, page: 1, perPage: 20 })),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it("requires auth", async () => {
    const res = await http(baseUrl, "/bets/me");
    expect(res.status).toBe(403);
    expect(serviceMock.execute).not.toHaveBeenCalled();
  });

  it("returns empty list when the player has no bets", async () => {
    const res = await http(baseUrl, "/bets/me", { headers: bearer() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ items: [], total: 0, page: 1, perPage: 20 });
  });

  it("forwards auth'd userId and pagination to the service", async () => {
    await http(baseUrl, "/bets/me?page=2&perPage=10", { headers: bearer() });
    expect(serviceMock.execute).toHaveBeenCalledWith({
      playerId: TEST_USER.userId,
      page: 2,
      perPage: 10,
    });
  });

  it("maps rounds + bets into MyBetResponseDto shape", async () => {
    const round = buildRound({ status: "CRASHED" });
    const bet = makeBet(TEST_USER.userId);
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.success({ items: [{ round, bet }], total: 1, page: 1, perPage: 20 }),
      ),
    );
    const res = await http(baseUrl, "/bets/me", { headers: bearer() });
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].roundId).toBe(round.id.value);
    expect(body.items[0].seedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.items[0].currentStatus).toBe("CRASHED");
    expect(body.items[0].bet.playerId).toBe(TEST_USER.userId);
  });
});
