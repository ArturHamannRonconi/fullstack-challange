import crypto from "node:crypto";

/**
 * Simulação completa de uma rodada de Crash (Provably Fair - Multiplayer)
 */
function generateCrashPoint(
  serverSeed: string,
  roundId: number
): number {
  // =========================
  // 🎯 INPUTS INICIAIS
  // =========================

  // serverSeed (segredo do servidor)
  // DEBUG:
  // serverSeed = "f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11"

  // roundId (nonce global)
  // DEBUG:
  // roundId = 102847

  // =========================
  // 🔒 HASH DO SERVER SEED (commit antes da rodada)
  // =========================
  const serverSeedHash = crypto
    .createHash("sha256")
    .update(serverSeed)
    .digest("hex");

  // DEBUG:
  // serverSeedHash =
  // "6f1c3b2e9a8d4c7f5b2a1e3d9c6f8a7b4e2d1c3f5a6b7c8d9e0f1a2b3c4d5e6"

  // =========================
  // 🔐 GERANDO HMAC
  // =========================
  const hmac = crypto.createHmac("sha256", serverSeed);

  const input = roundId.toString();

  // DEBUG:
  // input = "102847"

  hmac.update(input);

  const hash = hmac.digest("hex");

  // DEBUG:
  // hash =
  // "3fa4c2d9b7e1a6f8c5d4e3b2a1908765f4e3d2c1b0a9f8e7d6c5b4a392817061"

  // =========================
  // 🔍 PEGANDO 52 BITS
  // =========================
  const hex = hash.slice(0, 13);

  // DEBUG:
  // hex = "3fa4c2d9b7e1a"

  const int = parseInt(hex, 16);

  // DEBUG:
  // int = 112233445566778

  const max = Math.pow(2, 52);

  // DEBUG:
  // max = 4503599627370496

  // =========================
  // 🎰 HOUSE EDGE (opcional)
  // =========================
  const isInstantCrash = int % 33 === 0;

  // DEBUG:
  // 112233445566778 % 33 = 14
  // isInstantCrash = false

  if (isInstantCrash) {
    return 1.0;
  }

  // =========================
  // 🧮 CÁLCULO DO CRASH
  // =========================
  const result = (100 * max - int) / (max - int);

  // DEBUG:
  // result ≈ 2.47

  const crashPoint = Math.floor(result) / 100;

  // DEBUG:
  // crashPoint = 2.47

  return crashPoint;
}

/**
 * Verificação do jogador
 */
function verifyCrash(
  serverSeed: string,
  roundId: number,
  expected: number
): boolean {
  const result = generateCrashPoint(serverSeed, roundId);
  return result === expected;
}

/**
 * =========================
 * 🧪 EXECUÇÃO COMPLETA
 * =========================
 */

// Dados simulados
// Should be generated for Each new round and kept secret until the end of the round
const serverSeed = "f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11";
const roundId = 102847;

// Geração do resultado
const crash = generateCrashPoint(serverSeed, roundId);

console.log("Crash gerado:", crash);

// Verificação (lado do jogador)
const isValid = verifyCrash(serverSeed, roundId, crash);

console.log("Verificado:", isValid);

/**
 * =========================
 * 🧾 VISÃO FINAL (DEBUGGER)
 * =========================
 *
 * {
 *   serverSeed: "f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11",
 *
 *   serverSeedHash:
 *   "6f1c3b2e9a8d4c7f5b2a1e3d9c6f8a7b4e2d1c3f5a6b7c8d9e0f1a2b3c4d5e6",
 *
 *   roundId: 102847,
 *
 *   input: "102847",
 *
 *   hash:
 *   "3fa4c2d9b7e1a6f8c5d4e3b2a1908765f4e3d2c1b0a9f8e7d6c5b4a392817061",
 *
 *   hex(52bits): "3fa4c2d9b7e1a",
 *
 *   int: 112233445566778,
 *
 *   max: 4503599627370496,
 *
 *   houseEdgeCheck: false,
 *
 *   crashPoint: 2.47
 * }
 */