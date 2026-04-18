import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { Output } from "ddd-tool-kit";

import { GetLeaderboardService } from "../../../src/application/services/get-leaderboard/get-leaderboard.service";
import { GetLeaderboardController } from "../../../src/presentation/controllers/get-leaderboard.controller";
import { bootTestApp, http } from "./helpers/make-app";

describe("GetLeaderboardController (integration)", () => {
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
      controllers: [GetLeaderboardController],
      providers: [{ provide: GetLeaderboardService, useValue: serviceMock }],
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

  it("is public", async () => {
    const res = await http(baseUrl, "/rounds/leaderboard");
    expect(res.status).toBe(200);
  });

  it("converts BigInt totals to strings in the response", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.success({
          items: [
            {
              playerId: "p1",
              username: "alice",
              totalProfitCents: 12345n,
              totalStakedCents: 50000n,
              betsCount: 10,
              wins: 7,
              losses: 3,
            },
          ],
          total: 1,
          page: 1,
          perPage: 20,
        }),
      ),
    );
    const res = await http(baseUrl, "/rounds/leaderboard");
    const body = await res.json();
    expect(body.items[0].totalProfitCents).toBe("12345");
    expect(body.items[0].totalStakedCents).toBe("50000");
    expect(body.items[0].wins).toBe(7);
    expect(body.items[0].losses).toBe(3);
  });

  it("forwards query params search/page/perPage", async () => {
    const res = await http(
      baseUrl,
      "/rounds/leaderboard?page=2&perPage=5&search=alice",
    );
    expect(res.status).toBe(200);
    expect(serviceMock.execute).toHaveBeenCalledWith({
      page: 2,
      perPage: 5,
      search: "alice",
    });
  });

  it("rejects search longer than 64 chars with 400", async () => {
    const tooLong = "a".repeat(65);
    const res = await http(baseUrl, `/rounds/leaderboard?search=${tooLong}`);
    expect(res.status).toBe(400);
  });
});
