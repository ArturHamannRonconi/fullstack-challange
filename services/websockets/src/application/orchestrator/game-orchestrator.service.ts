import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import {
  type IEventBroker,
  type StartRoundPayload,
  EVENT_BROKER_PROVIDER,
} from "@crash/events";

import {
  BETTING_WINDOW_MS,
  PHASE_TRANSITION_MS,
  TICK_INTERVAL_MS,
  computeMultiplier,
  computeMultiplierScaled,
} from "@crash/game";

import { CrashedDomainEvent } from "../../domain/events/crashed.domain-event";
import { PrepareRoundDomainEvent } from "../../domain/events/prepare-round.domain-event";
import { StartGameDomainEvent } from "../../domain/events/start-game.domain-event";
import { RoundStateStore } from "../../infrastructure/nosql/round-state.store";
import { GameGateway } from "../../presentation/gateway/game.gateway";

type Phase =
  | "idle"
  | "preparing"
  | "waiting_start"
  | "betting_open"
  | "betting_closed"
  | "running"
  | "crashed";

interface ActiveRound {
  roundId: string;
  seedHash: string;
  crashPointScaled: number;
  startedAtMs?: number;
}

@Injectable()
export class GameOrchestratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GameOrchestratorService.name);

  private phase: Phase = "idle";
  private active: ActiveRound | null = null;
  private timers: NodeJS.Timeout[] = [];
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(EVENT_BROKER_PROVIDER)
    private readonly eventBroker: IEventBroker,
    private readonly gateway: GameGateway,
    private readonly roundState: RoundStateStore,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    setTimeout(() => void this.startCycle("boot"), 2_000);
  }

  // ---- External event entry points (called by consumers) ----

  onStartRound(payload: StartRoundPayload): void {
    if (this.phase !== "preparing" && this.phase !== "waiting_start") {
      this.logger.warn(
        `onStartRound in unexpected phase=${this.phase}; proceeding anyway.`,
      );
    }
    this.active = {
      roundId: payload.roundId,
      seedHash: payload.seedHash,
      crashPointScaled: payload.crashPointScaled,
    };
    this.phase = "waiting_start";
    this.logger.log(
      `round.start received (roundId=${payload.roundId}, crashScaled=${payload.crashPointScaled}).`,
    );

    this.gateway.broadcastStart({
      roundId: payload.roundId,
      seedHash: payload.seedHash,
    });

    this.scheduleTimer(() => this.enterBettingOpen(), PHASE_TRANSITION_MS);
  }

  onBetPlaced(payload: {
    roundId: string;
    playerId: string;
    username?: string;
    stakedAmount: string;
  }): void {
    this.gateway.broadcastBet(payload);
  }

  onCashedOut(payload: {
    roundId: string;
    playerId: string;
    username?: string;
    multiplier: number;
  }): void {
    this.gateway.broadcastCashOut(payload);
  }

  // ---- Internal state machine ----

  private async startCycle(reason: "boot" | "after_crash" | "manual" | undefined): Promise<void> {
    if (this.phase !== "idle" && this.phase !== "crashed") {
      this.logger.warn(`startCycle skipped: phase=${this.phase}.`);
      return;
    }

    this.clearTimers();
    this.phase = "preparing";
    this.active = null;
    this.logger.log(`Starting round cycle (reason=${reason}).`);
    this.gateway.broadcastPreparing();

    const payload = { triggerReason: reason }
    const event = new PrepareRoundDomainEvent(payload);
    await this.eventBroker.client.publish(event);
  }

  private enterBettingOpen(): void {
    if (!this.active) return;
    this.phase = "betting_open";
    this.logger.log(`betting_open (roundId=${this.active.roundId}).`);
    const closesAtMs = Date.now() + BETTING_WINDOW_MS;
    this.gateway.broadcastBettingOpen({ closesAtMs });
    this.scheduleTimer(() => this.enterBettingClosed(), BETTING_WINDOW_MS);
  }

  private enterBettingClosed(): void {
    if (!this.active) return;
    this.phase = "betting_closed";
    this.logger.log(`betting_closed (roundId=${this.active.roundId}).`);
    this.gateway.broadcastBettingClosed();
    this.scheduleTimer(() => void this.enterRunning(), PHASE_TRANSITION_MS);
  }

  private async enterRunning(): Promise<void> {
    if (!this.active) return;
    const startedAtMs = Date.now();
    this.active.startedAtMs = startedAtMs;
    this.phase = "running";
    this.logger.log(
      `round.running (roundId=${this.active.roundId}, startedAt=${startedAtMs}).`,
    );

    await this.roundState.setStartedAtMs(this.active.roundId, startedAtMs);

    const startGamePayload = { roundId: this.active.roundId, startedAtMs };
    const startGameEvent = new StartGameDomainEvent(startGamePayload);
    await this.eventBroker.client.publish(startGameEvent);

    this.gateway.broadcastGameStart();
    this.startTickLoop();
  }

  private startTickLoop(): void {
    if (!this.active) return;
    if (this.tickInterval) clearInterval(this.tickInterval);

    const startedAtMs = this.active.startedAtMs!;
    const crashPointScaled = this.active.crashPointScaled;
    const crashScaled10k = BigInt(crashPointScaled) * 100n;

    this.tickInterval = setInterval(() => {
      if (!this.active) return;
      const elapsedMs = Date.now() - startedAtMs;
      const multiplierScaled = computeMultiplierScaled(elapsedMs);

      if (multiplierScaled >= crashScaled10k) {
        this.gateway.broadcastTick({ multiplier: crashPointScaled / 100 });
        void this.enterCrashed();
        return;
      }

      const multiplier = computeMultiplier(elapsedMs);
      this.gateway.broadcastTick({ multiplier });
    }, TICK_INTERVAL_MS);
  }

  private async enterCrashed(): Promise<void> {
    if (!this.active) return;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.phase = "crashed";
    const crashed = this.active;
    this.logger.log(
      `round.crashed (roundId=${crashed.roundId}, crashPointScaled=${crashed.crashPointScaled}).`,
    );

    this.gateway.broadcastCrashed({ crashPoint: crashed.crashPointScaled / 100 });

    const crashedPayload = { roundId: crashed.roundId, crashPointScaled: crashed.crashPointScaled, seedHash: crashed.seedHash, serverSeed: "" };
    const crashedEvent = new CrashedDomainEvent(crashedPayload);
    await this.eventBroker.client.publish(crashedEvent);

    this.scheduleTimer(() => void this.startCycle("after_crash"), PHASE_TRANSITION_MS);
  }

  // ---- Timer utilities ----

  private scheduleTimer(fn: () => void, delay: number): void {
    const t = setTimeout(fn, delay);
    this.timers.push(t);
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  getSnapshot(): { phase: Phase; active: ActiveRound | null } {
    return { phase: this.phase, active: this.active };
  }
}
