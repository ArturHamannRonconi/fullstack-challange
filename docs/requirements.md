# Extremely necessary (everyone must pass)
- Tests exist (unit + E2E)
- bun run docker:up starts everything without manual steps
- Gameplay works (bet → multiplier → cashout/crash → settlement)
- Two separate services communicating via RabbitMQ/SQS
- Real-time synchronization (multiple tabs show the same state)
- Monetary precision (no floating point for money, balance never negative)
- Authentication via IdP (Keycloak/Auth0/Okta) — backend validates JWTs

# YOU CANNOT DO
- No tests
- Floating-point arithmetic for monetary values
- bun run docker:up doesn't work

# Techinical Requirements

## Stack
| Layer               | Tech                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| **Runtime**         | Bun (latest)                                                          |
| **Backend**         | NestJS + TypeScript (strict mode)                                     |
| **SQL Database**    | PostgreSQL 18+ with ORM (MikroORM, Prisma or TypeORM)                 |
| **NoSQL Database**  | Redis for dev/local and DynamoDB Serverlessfor AWS Production System  |
| **Messaging**       | RabbitMQ, Kafka or AWS SQS (Via LocalStack)                           |
| **API Gateway**     | Kong or AWS API Gateway                                               |
| **IdP**             | Keycloak (preferred), Auth0 or Okta                                   |
| **WebSocket**       | `@nestjs/websockets` + `socket.io` or `ws`                            |
| **Frontend**        | Next.js, Vite or Tanstack Start                                       |
| **Styles**          | Tailwind CSS v4 + shadcn/ui                                           |
| **State**           | TanStack Query (server state) + Zustand or Context (client state)     |
| **Tests**           | Bun test runner or Vitest                                             |
| **Docs**            | Swagger / OpenAPI (`@nestjs/swagger`)                                 |
| **Infra**           | Docker Compose                                                        |

## For file creation templates, you can follow these guidelines:
- For Aggregate Roots use @docs/@files-patterns/aggregate-root.md
- For Entities use @docs/@files-patterns/entity.md
- For ValueObjects use @docs/@files-patterns/value-object.md
- For Services use @docs/@files-patterns/service.md
- For Controllers use @docs/@files-patterns/controller.md
- For Schema use @docs/@files-patterns/schema.md
- For Unidirectional Mappers use @docs/@files-patterns/unidirectional-mapper.md
- For Bidirectional Mapper use @docs/@files-patterns/bidirectional-mapper.md
- For Algorithim Provably Fair use @provably-fair.example.ts as a reference


## The **generally** correct flow in REST Apis should be follow these guidelines:
- When client use GET methods: frontend->microservice->controller->service->repository->PostgreSQL->BidirectionalMapper->AggregateRoot->service->UnidirectionalMapper->Dto->controller->frontend
- When client use POST (create something) methods: frontend->microservice->controller->service->AggregateRoot->repository->BidirectionalMapper->PostgreSQL->service->controller->frontend
- When client use PUT or PATCH (update something) methods: frontend->microservice->controller->service->repository->PostgreSQL->BidirectionalMapper->AggregateRoot->EDIT in MEMORY using domain class methods->repository->BidirectionalMapper->PostgreSQL->service->controller->frontend

## Routes
## Wallets
| Método  | Endpoint            | Auth | Descrição          |
| ------  | ------------------- | ---- | ------------------ |
| `POST`  | `/wallets`          | Yes  | Create user wallet |
| `PATCH` | `/wallets/deposit`  | Yes  | Deposit more funds |
| `PATCH` | `/wallets/withdraw` | Yes  | Withdraw funds     |
| `GET`   | `/wallets/me`       | Yes  | get user wallet    |

## Games
| Método | Endpoint                        | Auth | Descrição                                  |
| ------ | ------------------------------- | ---- | ------------------------------------------ |
| `GET`  | `/games/rounds/current`         | Not  | State from current round                   |
| `GET`  | `/games/rounds/history`         | Not  | Paginated rounds historic                  |
| `GET`  | `/games/rounds/:roundId/verify` | Not  | Provably fair verification                 |
| `GET`  | `/games/bets/me`                | Yes  | Player bets historic                       |
| `POST` | `/games/bet`                    | Yes  | Make bet in current round                  |
| `POST` | `/games/bet/cashout`            | Yes  | Cashout in current round                   |

## Tests 🧪 (Required)
- Unit Tests (domain layer):
  - Round Lifecycle (state transitions, invariant violation)
  - Bet Logic (cashout calculation, status transitions, value validation)
  - Wallet (credit, debit, insufficient balance, monetary accuracy)
  - Provably fair (deterministic crash point calculation, hash chain verification)
- E2E (API layer):
  - Bet → multiplier increases → cashout → balance updated
  - Bet → crash → bet lost
  - Validation errors (insufficient balance, double bet, bet during active round)

---

# Functional Requirements

## Game Rules
- Betting Phase: Configurable window (e.g., 10s) for betting. Each player can only place one bet per round.
- Round Start: The multiplier starts at 1.00x and increases continuously.
- Cash Out: The player can cash-out at any time during the round. Payout = bet × current multiplier. After cash-out, re-entry is not possible.
- Crash: The multiplier stops at a pre-determined point. Whoever did not withdraw loses the bet.
- Round End: Results revealed, balances updated, new betting phase begins.

## Restrictions:
- Minimum bet: 1.00 / Maximum: 1,000.00
- Insufficient balance → bet rejected
- No bet in the round → cannot withdraw
- Active round → cannot bet (only during the betting phase)



## Domain Schema
### Package "@crash/domain"
- MoneyValueObject (Must be in cents)

### Wallet
```
ReserveEntity {
  funds: MoneyValueObject;
  betId: IdValueObject;
  roundId: IdValueObject;
}

OperationTypeValueObject // DEPOSIT, WITHDRAW, RESERVE, LOST, WIN

OperationEntity {
  type: OperationTypeValueObject;
  funds: MoneyValueObject;
  createdAt: DateValueObject;
}

WallletAggregateRoot {
  balance: MoneyValueObject;
  reserveds: MoneyValueObject[];
  historic: OperationEntity[];

  depositFunds(amount: MoneyValueObject) {

  }

  withdrawFunds(amount: MoneyValueObject) {

  }

  reserveFunds(
    roundId: IdValueObject,
    amount: MoneyValueObject
  ) {

  }

  settleReservedFunds(
    bet: BetEntity,
    reservedId: IdValueObject
  ) {

  }
}
```

### Game
```
BetEntity {
  playerId: IdValueObject; // Received from frontend by keycloak user ID
  stakedAmount: MoneyValueObject;
  cashOutPoint?: CashOutPointValueObject;
}

SeedValueObject {
  get value() {
    return this.props.value;
  }

  get hash() {
    // you need consider 1% house edge 

    const serverSeedHash = crypto
      .createHash("sha256")
      .update(serverSeed)
      .digest("hex");
  }

  get crashPoint() {
    // use this file to get the calc for crashPoint @provably-fair.example.ts
  }

  verify() {

  }

  static generate() {}

}

RoundAggregateRoot {
  id: IdValueObject;
  bets: BetEntity[];
  // Should be the same timestamp in round_start status date
  startedAt: DateValueObject;
  
  // All this valueObjects are generated in
  seed: SeedValueObject; 

  roundStatus: RoundStatusEntity[
    id: IdValueObject;
    statusDate: DateValueObject;
    // BETTING_OPEN, BETTING_CLOSED, ROUND_START, CRASHED
    status: RoundStatusValueObject;
  ]; 
}
```

## Domain Events and Consumers
- Domain events will be sent by the DomainEventHandler, which will be located in the packages at @crash/domain-events.
- The DomainEventHandler will be an interface that can have various implementations, but in this project we will only create the RabbitMQ implementation.
- Each service will have its own sending events and consumers, which will be located in the following directories:
  - domain/events/*
  - infrastructure/consumers/*
- Events will be sent to RabbitMQ; a consumer in each service can consume the same event.
  - Example: `CashedOutDomainEvent` is an event that will be sent to RabbitMQ; however, three places should consume this event: Wallet Service, Game Service, and Websocket Service. The event must have the same inputs for all, and each will use this event in whatever way they see fit through the `Consumer` class in each service.

## Services
### Wallet Service
- Responsible for the player's wallet: balance, credit and debit transactions.
  - Wallet — One per player.
  - Never use floating-point for money, use whole cents (BIGINT).

### Game Service
- Responsible for the round lifecycle, bets, crash logic, provably fair.
  - Round — Main aggregate. Manages the complete lifecycle of a round.
  - Bet — A player's bet entity in a round.
  - Crash Point — Predetermined multiplier where the round ends (generated via a provably fair algorithm).

### Websocket Service
| Name                  | Type      | Direction                   | Payload 
|---------------------- | --------- | --------------------------- | --------------------------------------------               
| round:preparing       | BROADCAST | Server -> Client            | {}
| round:start           | BROADCAST | Server -> Client            | { roundId: string; seedHash: string; }
| round:betting_open    | BROADCAST | Server -> Client            | {}
| round:bet             | BROADCAST | Server -> Client            | { roundId: string; playerId: string; stakedAmount: number; }
| round:betting_closed  | BROADCAST | Server -> Client            | {}
| round:game_start      | BROADCAST | Server -> Client            | {}
| round:game_tick       | BROADCAST | Server -> Client            | { multiplier: number; }
| round:cash_out        | BROADCAST | Server -> Client            | { roundId: string; playerId: string; multiplier: number; }
| round:crashed         | BROADCAST | Server -> Client            | { crashPoint: number; }


- round:preparing
  - Sent when the server is preparing a new round, before opening bets. Clients can use this event to reset their state and prepare for the new round.
  - Websocket Service send Domain Event (PrepareRoundDomainEvent) to create new RoundAggregateRoot with CrasingPoint generated.
    - This event is sended to RabbitMQ and Game Service will consume it to create a new Round in PostgreSQL.
    - The Game Service will save the crashPoint in NoSQL Database with roundId as key for later use.
  - After that, Game Service will send another Domain Event (StartRoundDomainEvent(roundId, seedHash)) to RabbitMQ.
      - Websocket Service will consume in some consumer this event and send round:start to clients

- round:start
  - Sent to client when round starts to frontend use roundId and seedHash.
  - After 500ms, Websocket Service will send round:betting_open to clients.

- round:betting_open
  - Sent to client when round is open for bets. Clients can use this event to enable betting UI and allow players to place their bets.
  - After 10 seconds, Websocket Service will send round:betting_closed to clients.

- round:bet
  - This event will be executed after the Websocket service receives a BetDomainEvent domain event, which will occur whenever a player successfully bet on the bet route.

- round:betting_closed
  - Sent to client when round is closed for bets. Clients can use this event to disable betting UI and prevent players from placing bets.
  - After 500ms, Websocket Service will send round:game_start to clients.

- round:game_start
  - Websocket Service will create startedAt variable with new Date().getTime()
  - Websocket Service send Domain Event (StartGameDomainEvent(startedAt)) to RabbitMQ to start the game.
  - Websocket Service will save the startedAt in NoSQL Database with roundId as key.
  - Websocket Service will create a setInterval to send round:game_tick every 100ms to clients.

- round:game_tick
  - Sent to client the current multiplier. Clients can use this event to update the game UI and show the current multiplier to players.
  - Websocket Service will calculate the current multiplier based on the startedAt and the SPEED that will be a constant in the package game.
  - The formula is: 
      // const SPEED = 0.00006; // This is a constant that will be used to calculate the multiplier
      // import { SPEED } from '@crash/game';
      const elapsed = Date.now() - round.startedAt;
      const multiplier = Math.exp(SPEED * elapsed)
  - Websocket Service will verify if the multiplier is greater than or equal to the crashPoint. If it is, Websocket Service will clear the interval and send round:crashed to clients.
  - Client that received round:crashed will ignore any round:game_tick that come after.

- round:cash_out
  - This event will be executed after the Websocket service receives a CashedOutDomainEvent domain event, which will occur whenever a player successfully cashes out on the cashout route.

- round:crashed
  - Sent to client when round crashes. Clients can use this event to update the game UI and show the final multiplier to players.
  - Websocket Service will gets the crashPoint in NoSQL Database and send it in the payload of the event.
  - After 500ms, Websocket Service will send round:preparing to clients.


## Frontend
- Game Page (Main)
  - Crash Graph — Animated multiplier rising from 1.00x, visual curve, clear crash indication, seed hash displayed before the round.
  - Bet Controls — Value entry with validation, "Bet" button (enabled only during the betting phase), "Cash Out" button (enabled only during the active round with a pending bet, displaying potential payout), countdown timer.
  - Current Round Bets — Real-time list of all bets, showing username, value, and status. Highlight cashouts.
  - Round History — Last ~20 crash points, color-coded (red = low crash, green = high crash).
  - Player Info — Current balance highlighted, username (from JWT).
- UI/UX
  - Dark mode — Casino aesthetic (dark background, vibrant/neon accents)
  - Responsive — Desktop and mobile
  - Animations — Smooth curve, cashout feedback, crash animation
  - Loading states — Skeletons or spinners
  - Errors — Toast notifications (insufficient balance, network error, etc.)