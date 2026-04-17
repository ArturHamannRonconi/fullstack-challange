-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "wallets" (
    "id" VARCHAR(16) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" VARCHAR(16) NOT NULL,
    "wallet_id" VARCHAR(16) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "funds" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserves" (
    "id" VARCHAR(16) NOT NULL,
    "wallet_id" VARCHAR(16) NOT NULL,
    "funds" BIGINT NOT NULL,
    "bet_id" VARCHAR(16) NOT NULL,
    "round_id" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "operations_wallet_id_idx" ON "operations"("wallet_id");

-- CreateIndex
CREATE INDEX "operations_wallet_id_created_at_idx" ON "operations"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "reserves_wallet_id_idx" ON "reserves"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "reserves_wallet_id_bet_id_key" ON "reserves"("wallet_id", "bet_id");

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserves" ADD CONSTRAINT "reserves_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

