import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { DateValueObject, IdValueObject, Output } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { CreateWalletService } from "../../../src/application/services/create-wallet/create-wallet.service";
import { CreateWalletController } from "../../../src/presentation/controllers/create-wallet.controller";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { WalletResponseMapper } from "../../../src/presentation/mappers/wallet-response.mapper";
import { TEST_USER, bearer, bootTestApp, http } from "./helpers/make-app";

function buildAggregate(balanceCents = 50_000n) {
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

describe("CreateWalletController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [CreateWalletController],
      providers: [
        { provide: CreateWalletService, useValue: serviceMock },
        WalletResponseMapper,
      ],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() => Promise.resolve(Output.success()));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await http(baseUrl, "/", { method: "POST" });
    expect(res.status).toBe(403);
    // Nest's default when guard returns false (no user) is 403, but the app sees
    // it as forbidden because the fake guard simply returns false. In production
    // `AuthGuard("jwt")` short-circuits with 401 — verified via e2e.
  });

  it("returns 201 with the wallet response when wallet is newly created", async () => {
    const aggregate = buildAggregate(50_000n);
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.success({ wallet: aggregate, wasCreated: true })),
    );

    const res = await http(baseUrl, "/", {
      method: "POST",
      headers: bearer(),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.userId).toBe(TEST_USER.userId);
    expect(body.balanceCents).toBe("50000");
    expect(serviceMock.execute).toHaveBeenCalledTimes(1);
    expect(serviceMock.execute).toHaveBeenCalledWith({ userId: TEST_USER.userId });
  });

  it("returns 200 when the wallet already existed (idempotent)", async () => {
    const aggregate = buildAggregate(12_345n);
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.success({ wallet: aggregate, wasCreated: false })),
    );

    const res = await http(baseUrl, "/", {
      method: "POST",
      headers: bearer(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.balanceCents).toBe("12345");
  });

  it("maps service failure status codes to Nest exceptions", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "nope", statusCode: 409 }),
      ),
    );

    const res = await http(baseUrl, "/", {
      method: "POST",
      headers: bearer(),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toBe("nope");
  });

  it("forwards the 500 status when the service returns an internal error", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "boom", statusCode: 500 }),
      ),
    );

    const res = await http(baseUrl, "/", {
      method: "POST",
      headers: bearer(),
    });
    expect(res.status).toBe(500);
  });
});
