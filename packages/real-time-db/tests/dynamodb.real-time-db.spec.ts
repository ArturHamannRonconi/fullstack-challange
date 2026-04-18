import { describe, expect, it } from "bun:test";

import { DynamoDbRealTimeDb } from "../src";

// The DynamoDB implementation is a stub — it's there to document the port
// without implementing it yet. Guard against accidental usage.
describe("DynamoDbRealTimeDb (placeholder)", () => {
  const db = new DynamoDbRealTimeDb();

  it("throws on get()", async () => {
    await expect(db.get("k")).rejects.toThrow("not implemented");
  });

  it("throws on set()", async () => {
    await expect(db.set("k", "v")).rejects.toThrow("not implemented");
  });

  it("throws on del()", async () => {
    await expect(db.del("k")).rejects.toThrow("not implemented");
  });

  it("throws on exists()", async () => {
    await expect(db.exists("k")).rejects.toThrow("not implemented");
  });
});
