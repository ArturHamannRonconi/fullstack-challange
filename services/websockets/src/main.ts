import "reflect-metadata";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { LazyIoAdapter } from "./presentation/gateway/lazy-io-adapter";

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function toJSON() {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new LazyIoAdapter(app));
  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4003);
  await app.listen(port, "0.0.0.0");
  console.log(`Websockets service running on port ${port}`);
}

bootstrap();
