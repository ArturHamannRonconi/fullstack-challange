import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { INestApplication } from "@nestjs/common";
import { Output } from "ddd-tool-kit";

import { GetRoundsHistoryService } from "../../../src/application/services/get-rounds-history/get-rounds-history.service";
import { GetRoundsHistoryController } from "../../../src/presentation/controllers/get-rounds-history.controller";
import { RoundResponseMapper } from "../../../src/presentation/mappers/round-response.mapper";
import { bootTestApp, http } from "./helpers/make-app";
import { buildRound } from "./helpers/round-factory";

describe("GetRoundsHistoryController (integration)", () => {
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
      controllers: [GetRoundsHistoryController],
      providers: [
        { provide: GetRoundsHistoryService, useValue: serviceMock },
        RoundResponseMapper,
      ],
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
    const res = await http(baseUrl, "/rounds/history");
    expect(res.status).toBe(200);
  });

  it("returns empty paginated result when no rounds exist", async () => {
    const res = await http(baseUrl, "/rounds/history");
    const body = await res.json();
    expect(body).toEqual({ items: [], total: 0, page: 1, perPage: 20 });
  });

  it("maps rounds to response DTOs", async () => {
    const round = buildRound({ status: "CRASHED" });
    serviceMock.execute = mock(() =>
      Promise.resolve(Output.success({ items: [round], total: 1, page: 1, perPage: 20 })),
    );
    const res = await http(baseUrl, "/rounds/history");
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(round.id.value);
    expect(body.items[0].currentStatus).toBe("CRASHED");
  });

  it("defaults to page=1, perPage=20 when no query", async () => {
    await http(baseUrl, "/rounds/history");
    expect(serviceMock.execute).toHaveBeenCalledWith({ page: 1, perPage: 20 });
  });

  it("forwards valid pagination query params", async () => {
    const res = await http(baseUrl, "/rounds/history?page=3&perPage=5");
    expect(res.status).toBe(200);
    expect(serviceMock.execute).toHaveBeenCalledWith({ page: 3, perPage: 5 });
  });

  it("rejects perPage outside 1..50 with 400", async () => {
    const res = await http(baseUrl, "/rounds/history?perPage=100");
    expect(res.status).toBe(400);
  });

  it("rejects page<1 with 400", async () => {
    const res = await http(baseUrl, "/rounds/history?page=0");
    expect(res.status).toBe(400);
  });
});
