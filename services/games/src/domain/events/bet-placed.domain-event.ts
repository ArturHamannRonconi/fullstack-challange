import { DomainEvent, DomainEventName, type BetPlacedPayload } from "@crash/events";

export class BetPlacedDomainEvent extends DomainEvent<BetPlacedPayload> {
  constructor(payload: BetPlacedPayload) {
    super(payload, DomainEventName.BetPlaced);
  }
}
