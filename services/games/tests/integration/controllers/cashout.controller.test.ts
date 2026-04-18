import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { Output } from "ddd-tool-kit";

import { CashoutService } from "../../../src/application/services/cashout/cashout.service";
import { CashoutController } from "../../../src/presentation/controllers/cashout.controller";
import { TEST_USER, bearer, bootTestApp, http } from "./helpers/make-app";
import { buildRound, makeBet } from "./helpers/round-factory";

describe("CashoutController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [CashoutController],
      providers: [{ provide: CashoutService, useValue: serviceMock }],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() => Promise.resolve(Output.success()));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("rejects cashout without auth", async () => {
    const res = await http(baseUrl, "/bet/cashout", { method: "POST" });
    expect(res.status).toBe(403);
    expect(serviceMock.execute).not.toHaveBeenCalled();
  });

  it("returns 200 with the cashed-out bet and payout on success", async () => {
    const round = buildRound({ status: "ROUND_START" });
    const bet = makeBet(TEST_USER.userId);
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.success({
          bet,
          round,
          multiplierScaled: 25_000n,
          totalPayoutCents: "2500",
          netProfitCents: "1500",
        }),
      ),
    );

    const res = await http(baseUrl, "/bet/cashout", {
      method: "POST",
      headers: bearer(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roundId).toBe(round.id.value);
    expect(body.multiplierScaled).toBe("25000");
    expect(body.totalPayoutCents).toBe("2500");
    expect(body.netProfitCents).toBe("1500");
    expect(serviceMock.execute).toHaveBeenCalledWith({
      playerId: TEST_USER.userId,
      username: TEST_USER.username,
    });
  });

  it("propagates 422 when round is not running", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "Round not running", statusCode: 422 })),
    );
    const res = await http(baseUrl, "/bet/cashout", {
      method: "POST",
      headers: bearer(),
    });
    expect(res.status).toBe(422);
  });

  it("propagates 404 when the player has no bet", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "Bet not found", statusCode: 404 })),
    );
    const res = await http(baseUrl, "/bet/cashout", {
      method: "POST",
      headers: bearer(),
    });
    expect(res.status).toBe(404);
  });
});
