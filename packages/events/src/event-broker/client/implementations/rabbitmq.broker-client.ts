import { Channel } from "amqp-connection-manager";

import { DomainEvent } from "../../../abstracts/domain-event";
import { EventMessageHandler, IEventBrokerClient } from "../broker-client.interface";
import { RabbitMQEventBrokerManager } from "../../manager/implementations/rabbitmq.broker-manager";


interface WireMessage {
  pattern: string;
  data: DomainEvent<unknown>;
}

export class RabbitMQEventBrokerClient implements IEventBrokerClient {
  private readonly consumerTags = new Map<string, string>();

  constructor(private readonly manager: RabbitMQEventBrokerManager) {}

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    if (!this.manager.channel) throw new Error("Channel is not initialized. Call connect() first.");

    const wireMessage: WireMessage = { pattern: event.name, data: event };
    const options = {
      persistent: true,
      contentType: "application/json",
      messageId: event.messageId,
      timestamp: Date.now(),
      headers: { "x-event-name": event.name },
    };

    await this.manager.channel.publish(
      this.manager.DOMAIN_EVENTS_EXCHANGE,
      event.name,
      wireMessage,
      options,
    );
  }

  async subscribe<TPayload>(
    queueName: string,
    handler: EventMessageHandler<TPayload>,
  ): Promise<void> {
    if (!this.manager.channel) throw new Error("Channel is not initialized. Call connect() first.");

    await this.manager.channel.addSetup(async (channel: Channel) => {
      const { consumerTag } = await channel
        .consume(queueName, async (message) => {
          if (!message) return;

          const context = {
            ack: () => channel.ack(message),
            nack: (requeue = false) => channel.nack(message, false, requeue),
          };


          let event: DomainEvent<TPayload>;
          try {
            const parsed = JSON.parse(message.content.toString()) as
              | WireMessage
              | DomainEvent<TPayload>;
            event =
              "data" in parsed && "pattern" in parsed
                ? (parsed.data as DomainEvent<TPayload>)
                : (parsed as DomainEvent<TPayload>);
          } catch (err) {
            channel.nack(message, false, false);
            return;
          }

          try {
            await handler(event, context);
          } catch (err) {
            context.nack(false);
          }
        }, { noAck: false });

      this.consumerTags.set(queueName, consumerTag);
    });
  }

  async unsubscribe(queueName: string): Promise<void> {
    if (!this.manager.channel) throw new Error("Channel is not initialized. Call connect() first.");
    
    const tag = this.consumerTags.get(queueName);
    if (!tag) return;

    await this.manager.channel.addSetup(async (ch: Channel) => {
      await ch.cancel(tag);
    });
    this.consumerTags.delete(queueName);
  }
}
