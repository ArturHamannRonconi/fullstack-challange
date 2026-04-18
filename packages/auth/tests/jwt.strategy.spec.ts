import { describe, expect, it } from "bun:test";

import { JwtStrategy } from "../src/jwt.strategy";

describe("JwtStrategy.validate", () => {
  // The strategy instance can be constructed with a minimal options bag —
  // JWKS endpoints aren't hit until a real token arrives.
  const strategy = new JwtStrategy({
    issuer: "http://keycloak/realms/crash-game",
    audience: "crash-game-client",
    jwksUri: "http://keycloak/realms/crash-game/protocol/openid-connect/certs",
  });

  it("maps a full token payload into AuthenticatedUser (roles from realm_access)", () => {
    const user = strategy.validate({
      sub: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
      iss: "http://keycloak/realms/crash-game",
      aud: "crash-game-client",
      exp: 0,
      iat: 0,
      preferred_username: "alice",
      email: "alice@example.com",
      realm_access: { roles: ["player", "high-roller"] },
    });
    expect(user).toEqual({
      userId: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
      username: "alice",
      email: "alice@example.com",
      roles: ["player", "high-roller"],
    });
  });

  it("returns empty roles when realm_access is absent", () => {
    const user = strategy.validate({
      sub: "u1",
      iss: "x",
      aud: "y",
      exp: 0,
      iat: 0,
    });
    expect(user.userId).toBe("u1");
    expect(user.roles).toEqual([]);
    expect(user.username).toBeUndefined();
  });
});
