import {
  Channel,
  connect,
  ChannelWrapper,
  AmqpConnectionManager,
} from "amqp-connection-manager";

import { IEventBrokerManager } from "../broker-manager";
import { DomainEventName } from "../../../enums/domain-event-name";

export class RabbitMQEventBrokerManager implements IEventBrokerManager {
  public readonly DOMAIN_EVENTS_EXCHANGE = "crash_game.domain_events"

  public channel?: ChannelWrapper;
  public connection?: AmqpConnectionManager;

  async connect(): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) throw new Error("RABBITMQ_URL environment variable is not set");

    this.connection = connect(url);
    this.channel = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        await channel.assertExchange(
          this.DOMAIN_EVENTS_EXCHANGE,
          "direct",
          { durable: true }
        );
      },
    });

    await this.channel.waitForConnect();
  }

  async disconnect(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = undefined;
    this.connection = undefined;
  }

  async createQueue(
    queueName: string,
    eventName: DomainEventName
  ): Promise<void> {
    if (!this.channel) throw new Error("Channel is not initialized. Call connect() first.");

    await this.channel.addSetup(async (ch: Channel) => {
      await ch.assertQueue(queueName, { durable: true });
      await ch.bindQueue(queueName, this.DOMAIN_EVENTS_EXCHANGE, eventName);
    });
  }
}
