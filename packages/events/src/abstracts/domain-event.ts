import { DomainEventName } from "../enums/domain-event-name";

export abstract class DomainEvent<TPayload> {
  readonly name: string;
  readonly messageId: string;
  readonly occurredAt: string;
  readonly payload: TPayload;

  constructor(payload: TPayload, name: DomainEventName) {
    this.messageId = crypto.randomUUID();
    this.occurredAt = new Date().toISOString();
    this.payload = payload;
    this.name = name;
  }
}
