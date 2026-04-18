import { DomainEvent } from "../abstracts/domain-event";
import { DomainEventName } from "../enums/domain-event-name";
import { MicroServiceName } from "../enums/micro-service-name";
import { IEventBroker } from "../event-broker/event-broker";

export abstract class DomainHandler<TPayload> {
  protected readonly queueName: string;

  constructor(
    protected readonly eventBus: IEventBroker,
    protected readonly eventName: DomainEventName,
    protected readonly microService: MicroServiceName,
  ) {
    const eventSlug = this.eventName.replace(/[._]/g, "-");
    const queueName = `${eventSlug}-event-${this.microService}-queue`;
    this.queueName = queueName;
  }

  abstract handle(event: DomainEvent<TPayload>): Promise<void> | void;

  async onModuleInit(): Promise<void> {
    await this.eventBus.manager.createQueue(this.queueName, this.eventName);
    await this.eventBus.client.subscribe<TPayload>(
      this.queueName,
      async (event, ctx) => {
        try {
          await this.handle(event as DomainEvent<TPayload>);
          ctx.ack();
        } catch (err) {
          console.error(
            `[${this.queueName}] handler error for "${this.eventName}":`,
            err,
          );
          ctx.nack(false);
        }
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.eventBus.client.unsubscribe(this.queueName);
  }
}
