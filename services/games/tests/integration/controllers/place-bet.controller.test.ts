import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { Output } from "ddd-tool-kit";

import { PlaceBetService } from "../../../src/application/services/place-bet/place-bet.service";
import { PlaceBetController } from "../../../src/presentation/controllers/place-bet.controller";
import { TEST_USER, bearer, bootTestApp, http } from "./helpers/make-app";
import { buildRound, makeBet } from "./helpers/round-factory";

describe("PlaceBetController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [PlaceBetController],
      providers: [{ provide: PlaceBetService, useValue: serviceMock }],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() => Promise.resolve(Output.success()));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("rejects requests without auth", async () => {
    const res = await http(baseUrl, "/bet", {
      method: "POST",
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(403);
    expect(serviceMock.execute).not.toHaveBeenCalled();
  });

  it("returns 400 when body fails validation (missing amountCents)", async () => {
    const res = await http(baseUrl, "/bet", {
      method: "POST",
      headers: bearer(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(serviceMock.execute).not.toHaveBeenCalled();
  });

  it("returns 400 when amountCents is not a positive integer string", async () => {
    const res = await http(baseUrl, "/bet", {
      method: "POST",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "10.5" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 201 with the placed bet and balance info on success", async () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    const bet = makeBet(TEST_USER.userId);
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.success({
          bet,
          round,
          balanceCents: "49000",
          availableCents: "48000",
        }),
      ),
    );

    const res = await http(baseUrl, "/bet", {
      method: "POST",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "1000" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.roundId).toBe(round.id.value);
    expect(body.balanceCents).toBe("49000");
    expect(body.availableCents).toBe("48000");
    expect(body.bet.playerId).toBe(TEST_USER.userId);
    expect(body.bet.isCashedOut).toBe(false);
    expect(serviceMock.execute).toHaveBeenCalledTimes(1);
    expect(serviceMock.execute).toHaveBeenCalledWith({
      playerId: TEST_USER.userId,
      username: TEST_USER.username,
      amountCents: "1000",
    });
  });

  it("maps service failure status codes to Nest exceptions", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "Not enough funds", statusCode: 422 })),
    );

    const res = await http(baseUrl, "/bet", {
      method: "POST",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "1000" }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toBe("Not enough funds");
  });
});
