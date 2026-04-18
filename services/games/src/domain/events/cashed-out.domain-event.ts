import { DomainEvent, DomainEventName, type CashedOutPayload } from "@crash/events";

export class CashedOutDomainEvent extends DomainEvent<CashedOutPayload> {
  constructor(payload: CashedOutPayload) {
    super(payload, DomainEventName.CashedOut);
  }
}
