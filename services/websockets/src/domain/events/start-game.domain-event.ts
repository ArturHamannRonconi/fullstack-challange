import { DomainEvent, DomainEventName, type StartGamePayload } from "@crash/events";

export class StartGameDomainEvent extends DomainEvent<StartGamePayload> {
  constructor(payload: StartGamePayload) {
    super(payload, DomainEventName.StartGame);
  }
}
