import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { DateValueObject, IdValueObject, Output } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { DepositService } from "../../../src/application/services/deposit/deposit.service";
import { DepositController } from "../../../src/presentation/controllers/deposit.controller";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { WalletResponseMapper } from "../../../src/presentation/mappers/wallet-response.mapper";
import { TEST_USER, bearer, bootTestApp, http } from "./helpers/make-app";

function buildAggregate(balanceCents = 51_000n) {
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

describe("DepositController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [DepositController],
      providers: [
        { provide: DepositService, useValue: serviceMock },
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
    const res = await http(baseUrl, "/deposit", {
      method: "PATCH",
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and forwards amountCents to the service", async () => {
    const res = await http(baseUrl, "/deposit", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.balanceCents).toBe("51000");
    expect(serviceMock.execute).toHaveBeenCalledWith({
      userId: TEST_USER.userId,
      amountCents: "1000",
    });
  });

  it("returns 400 when amountCents is missing (ValidationPipe)", async () => {
    const res = await http(baseUrl, "/deposit", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when amountCents is non-numeric (ValidationPipe)", async () => {
    const res = await http(baseUrl, "/deposit", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when extra fields are present (forbidNonWhitelisted)", async () => {
    const res = await http(baseUrl, "/deposit", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "100", extra: "nope" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 422 when the service returns AMOUNT_OUT_OF_RANGE", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "Amount must be between 100 and 100000 cents.", statusCode: 422 }),
      ),
    );
    const res = await http(baseUrl, "/deposit", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "50" }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toContain("100 and 100000");
  });

  it("returns 404 when the service cannot find a wallet for the user", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "Wallet does not exist for this user.", statusCode: 404 }),
      ),
    );
    const res = await http(baseUrl, "/deposit", {
      method: "PATCH",
      headers: bearer(),
      body: JSON.stringify({ amountCents: "1000" }),
    });
    expect(res.status).toBe(404);
  });
});
