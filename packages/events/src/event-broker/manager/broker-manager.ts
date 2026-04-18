import { DomainEventName } from "../../enums/domain-event-name";

export interface IEventBrokerManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  createQueue(queueName: string, eventName: DomainEventName): Promise<void>;
}
