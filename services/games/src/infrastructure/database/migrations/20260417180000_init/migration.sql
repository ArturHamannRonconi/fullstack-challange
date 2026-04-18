-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "rounds" (
    "id" VARCHAR(16) NOT NULL,
    "server_seed" VARCHAR(128) NOT NULL,
    "seed_hash" VARCHAR(128) NOT NULL,
    "crash_point_scaled" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" VARCHAR(16) NOT NULL,
    "round_id" VARCHAR(16) NOT NULL,
    "player_id" VARCHAR(64) NOT NULL,
    "username" VARCHAR(64),
    "staked_amount" BIGINT NOT NULL,
    "cash_out_point_scaled" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_statuses" (
    "id" VARCHAR(16) NOT NULL,
    "round_id" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "status_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "round_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rounds_created_at_idx" ON "rounds"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bets_round_id_player_id_key" ON "bets"("round_id", "player_id");

-- CreateIndex
CREATE INDEX "bets_round_id_idx" ON "bets"("round_id");

-- CreateIndex
CREATE INDEX "bets_player_id_created_at_idx" ON "bets"("player_id", "created_at");

-- CreateIndex
CREATE INDEX "round_statuses_round_id_status_date_idx" ON "round_statuses"("round_id", "status_date");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_statuses" ADD CONSTRAINT "round_statuses_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
