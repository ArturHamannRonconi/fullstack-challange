import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { DateValueObject, IdValueObject, Output } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "../../../src/domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { ReserveFundsService } from "../../../src/application/services/reserve-funds/reserve-funds.service";
import { ReserveController } from "../../../src/presentation/controllers/reserve.controller";
import { bootTestApp, http } from "./helpers/make-app";

function buildWallet(balanceCents = 50_000n, available = 49_000n): WalletAggregateRoot {
  const userId = UserIdValueObject.init({
    value: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
  }).result as UserIdValueObject;
  const deposit = OperationEntity.init({
    type: OperationTypeValueObject.deposit(),
    funds: MoneyValueObject.init({ value: balanceCents })
      .result as MoneyValueObject,
    createdAt: DateValueObject.getDefault(),
  }).result as OperationEntity;
  const wallet = WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId,
    balance: MoneyValueObject.init({ value: balanceCents })
      .result as MoneyValueObject,
    reserveds: [],
    historic: [deposit],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;

  const reservedAmount = balanceCents - available;
  if (reservedAmount > 0n) {
    wallet.reserveFunds(
      IdValueObject.getDefault(),
      IdValueObject.getDefault(),
      MoneyValueObject.init({ value: reservedAmount }).result as MoneyValueObject,
    );
  }
  return wallet;
}

describe("ReserveController (integration)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let serviceMock: { execute: ReturnType<typeof mock> };

  beforeAll(async () => {
    serviceMock = { execute: mock(() => Promise.resolve(Output.success())) };
    ({ app, baseUrl } = await bootTestApp({
      controllers: [ReserveController],
      providers: [{ provide: ReserveFundsService, useValue: serviceMock }],
    }));
  });

  beforeEach(() => {
    serviceMock.execute = mock(() => Promise.resolve(Output.success()));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("returns 200 with reserveId and remaining balance/available cents", async () => {
    const wallet = buildWallet(50_000n, 49_000n);
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.success({ wallet, reserveId: "r-1" })),
    );

    const res = await http(baseUrl, "/reserve", {
      method: "POST",
      body: JSON.stringify({
        messageId: "m-1",
        userId: wallet.userId.value,
        roundId: IdValueObject.getDefault().value,
        betId: IdValueObject.getDefault().value,
        amountCents: "1000",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reserveId).toBe("r-1");
    expect(body.balanceCents).toBe("50000");
    expect(body.availableCents).toBe("49000");
    expect(serviceMock.execute).toHaveBeenCalledTimes(1);
  });

  it("maps service failure to the matching Nest exception", async () => {
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "Wallet not found.", statusCode: 404 })),
    );
    const res = await http(baseUrl, "/reserve", {
      method: "POST",
      body: JSON.stringify({
        messageId: "m-2",
        userId: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
        roundId: IdValueObject.getDefault().value,
        betId: IdValueObject.getDefault().value,
        amountCents: "1000",
      }),
    });
    expect(res.status).toBe(404);
  });
});
