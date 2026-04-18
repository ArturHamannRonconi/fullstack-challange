import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { DateValueObject, IdValueObject, Output } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { GetMyWalletService } from "../../../src/application/services/get-my-wallet/get-my-wallet.service";
import { GetMyWalletController } from "../../../src/presentation/controllers/get-my-wallet.controller";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { WalletResponseMapper } from "../../../src/presentation/mappers/wallet-response.mapper";
import { TEST_USER, bearer, bootTestApp, http } from "./helpers/make-app";

function buildAggregate() {
  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId: UserIdValueObject.init({ value: TEST_USER.userId })
      .result as UserIdValueObject,
    balance: MoneyValueObject.init({ value: 49_500n })
      .result as MoneyValueObject,
    reserveds: [],
    historic: [],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
}

describe("GetMyWalletController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [GetMyWalletController],
      providers: [
        { provide: GetMyWalletService, useValue: serviceMock },
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

  it("rejects calls without Authorization header", async () => {
    const res = await http(baseUrl, "/me");
    expect(res.status).toBe(403);
  });

  it("returns 200 with the wallet snapshot", async () => {
    const wallet = buildAggregate();
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.success({ wallet })),
    );

    const res = await http(baseUrl, "/me", { headers: bearer() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(TEST_USER.userId);
    expect(body.balanceCents).toBe("49500");
    expect(Array.isArray(body.operations)).toBe(true);
    expect(Array.isArray(body.reserves)).toBe(true);
    expect(serviceMock.execute).toHaveBeenCalledWith({ userId: TEST_USER.userId });
  });

  it("returns 404 when the service cannot find a wallet", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(
        Output.fail({ message: "not found", statusCode: 404 }),
      ),
    );

    const res = await http(baseUrl, "/me", { headers: bearer() });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("not found");
  });
});
