import { DomainEvent } from "../../abstracts/domain-event";

export interface IEventMessageContext {
  ack(): void;
  nack(requeue?: boolean): void;
}

export type EventMessageHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
  ctx: IEventMessageContext,
) => Promise<void> | void;

export interface IEventBrokerClient {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  unsubscribe(queueName: string): Promise<void>;
  subscribe<TPayload>(queueName: string, handler: EventMessageHandler<TPayload>): Promise<void>;
}
