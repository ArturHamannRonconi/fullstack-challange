import { DomainEvent, DomainEventName, type CrashedPayload } from "@crash/events";

export class CrashedDomainEvent extends DomainEvent<CrashedPayload> {
  constructor(payload: CrashedPayload) {
    super(payload, DomainEventName.Crashed);
  }
}
