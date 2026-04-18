import { DomainEvent, DomainEventName, type PrepareRoundPayload } from "@crash/events";

export class PrepareRoundDomainEvent extends DomainEvent<PrepareRoundPayload> {
  constructor(payload: PrepareRoundPayload) {
    super(payload, DomainEventName.PrepareRound);
  }
}
