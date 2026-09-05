import { createServer } from "./app.js";
import { fileEvents } from "./store.js";

const server = createServer(
  fileEvents(new URL("./events.json", import.meta.url)),
);
await server.listen({ host: "127.0.0.1", port: 5175 });
console.log("Fieldwork event API: http://127.0.0.1:5175/api/events/evt_01");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void server.close();
  });
