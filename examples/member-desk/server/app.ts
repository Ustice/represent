import Fastify from "fastify";
import { OperationError } from "@represent/core";
import { InvalidOperationInput, operationHandler } from "@represent/fastify";
import {
  lookupEvent,
  EventNotFound,
  type EventStore,
} from "../src/events/lookup.js";

export function createServer(store: EventStore) {
  const server = Fastify();
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof InvalidOperationInput)
      return reply.code(400).send({ error: "Invalid event lookup" });
    if (
      error instanceof OperationError &&
      error.stage === "perform" &&
      error.cause instanceof EventNotFound
    )
      return reply.code(404).send({ error: "Event not found" });
    if (
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    )
      return reply.code(error.statusCode).send({ error: "Invalid request" });
    request.log.error(error);
    return reply.code(500).send({ error: "The event lookup failed" });
  });
  server.get(
    "/api/events/:id",
    operationHandler(lookupEvent, {
      input: (request) => request.params,
      context: () => store,
    }),
  );
  return server;
}
