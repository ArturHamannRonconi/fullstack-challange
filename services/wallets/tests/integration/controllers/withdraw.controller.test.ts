import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { DateValueObject, IdValueObject, Output } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { WithdrawService } from "../../../src/application/services/withdraw/withdraw.service";
import { WithdrawController } from "../../../src/presentation/controllers/withdraw.controller";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { WalletResponseMapper } from "../../../src/presentation/mappers/wallet-response.mapper";
import { TEST_USER, bearer, bootTestApp, http } from "./helpers/make-app";

function buildAggregate(balanceCents = 49_000n) {
  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId: UserIdValueObject.init({ value: TEST_USER.userId })
      .result as UserIdValueObject,
    balance: MoneyValueObject.init({ value: balanceCents })
      .result as MoneyValueObject,
    reserveds: [],
    historic: [],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
}

describe("WithdrawController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [WithdrawController],
      providers: [
        { provide: WithdrawService, useValue: serviceMock },
        WalletResponseMapper,
      ],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.success({ wallet: buildAggregate() })),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it("rejects calls without Authorization header", async () => {
    const res = await http(baseUrl, "/withdraw", {
      method: "PATCH",
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with updated balance when service succeeds", async () => {
    const res = await http(baseUrl, "/withdraw", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.balanceCents).toBe("49000");
    expect(serviceMock.execute).toHaveBeenCalledWith({
      userId: TEST_USER.userId,
      amountCents: "1000",
    });
  });

  it("returns 400 when body is empty (ValidationPipe)", async () => {
    const res = await http(baseUrl, "/withdraw", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when amountCents contains a decimal", async () => {
    const res = await http(baseUrl, "/withdraw", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "10.50" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 422 when service reports INSUFFICIENT_FUNDS", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "Insufficient available funds for this operation.", statusCode: 422 }),
      ),
    );
    const res = await http(baseUrl, "/withdraw", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toContain("Insufficient");
  });

  it("returns 404 when service reports WALLET_DOES_NOT_EXIST", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "Wallet does not exist for this user.", statusCode: 404 }),
      ),
    );
    const res = await http(baseUrl, "/withdraw", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 422 when amount is out of range from the service", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "Amount must be between 100 and 100000 cents.", statusCode: 422 }),
      ),
    );
    const res = await http(baseUrl, "/withdraw", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "100001" }),
    });
    expect(res.status).toBe(422);
  });
});
