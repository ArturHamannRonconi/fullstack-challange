import { IEventBroker } from "../event-broker";
import { IEventBrokerManager } from "../manager/broker-manager";
import { MicroServiceName } from "../../enums/micro-service-name";
import { IEventBrokerClient } from "../client/broker-client.interface";
import { RabbitMQEventBrokerManager } from "../manager/implementations/rabbitmq.broker-manager";
import { RabbitMQEventBrokerClient } from "../client/implementations/rabbitmq.broker-client";

export class RabbitMQEventBroker implements IEventBroker {
  readonly client: IEventBrokerClient;
  readonly manager: IEventBrokerManager;

  constructor(readonly microService: MicroServiceName) {
    const rabbitmqManager = new RabbitMQEventBrokerManager();
    
    this.manager = rabbitmqManager;
    this.client = new RabbitMQEventBrokerClient(rabbitmqManager);
  }

  async onModuleInit(): Promise<void> {
    await this.manager.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.manager.disconnect();
  }
}
