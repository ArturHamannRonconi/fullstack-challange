import { DomainEvent, DomainEventName, type StartRoundPayload } from "@crash/events";

export class StartRoundDomainEvent
  extends DomainEvent<StartRoundPayload>
{
  constructor(payload: StartRoundPayload) {
    super(payload, DomainEventName.StartRound);
  }
}
