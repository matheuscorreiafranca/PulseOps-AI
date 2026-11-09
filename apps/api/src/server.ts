import { buildApp } from "./app.js";
import { envSchema } from "@pulseops/config";
import { startQueues } from "./queues.js";
const env = envSchema.parse(process.env);
const app = await buildApp();
const queueRuntime =
  process.env.ENABLE_WORKERS === "true" ? startQueues(env.REDIS_URL) : null;
app.addHook("onClose", async () => queueRuntime?.close());
await app.listen({ port: env.PORT, host: "0.0.0.0" });
