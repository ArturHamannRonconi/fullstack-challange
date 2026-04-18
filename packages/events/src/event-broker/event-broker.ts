import { MicroServiceName } from "../enums/micro-service-name";
import { IEventBrokerClient } from "./client/broker-client.interface";
import { IEventBrokerManager } from "./manager/broker-manager";

export interface IEventBroker {
  readonly microService: MicroServiceName;
  readonly client: IEventBrokerClient;
  readonly manager: IEventBrokerManager;
}

export const EVENT_BROKER_PROVIDER = Symbol("EVENT_BROKER_PROVIDER");