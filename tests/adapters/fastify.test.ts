import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import {
  OperationError,
  asyncOperation,
  operation,
  record,
  text,
} from "../../packages/represent/src/index.js";
import { operationHandler } from "../../packages/fastify/src/index.js";

const input = record("Lookup", { id: text("ID", { nonempty: true }) });
const output = record("Result", { label: text("Label", { nonempty: true }) });
describe("Fastify operation handlers", () => {
  it("does not classify a context failure as invalid operation input", async () => {
    let calls = 0;
    const subject = operation({
      name: "Context probe",
      input,
      output,
      perform: () => {
        calls++;
        return { label: "ok" };
      },
    });
    const server = Fastify();
    const cause = new OperationError(
      "Context lookup",
      "input",
      new Error("Bad context"),
    );
    server.post(
      "/context",
      operationHandler(subject, {
        input: (request) => request.body,
        context: () => Promise.reject(cause),
      }),
    );
    try {
      const response = await server.inject({
        method: "POST",
        url: "/context",
        payload: { id: "x" },
      });
      expect(response.statusCode).toBe(500);
      expect(calls).toBe(0);
    } finally {
      await server.close();
    }
  });
  it("supports synchronous operations while Fastify hooks own success status and headers", async () => {
    const subject = operation({
      name: "Echo",
      input,
      output,
      perform: ({ id }) => ({ label: id }),
    });
    const server = Fastify();
    server.post(
      "/sync",
      {
        onRequest: (_request, reply, done) => {
          reply.code(201).header("x-example", "echo");
          done();
        },
      },
      operationHandler(subject, {
        input: (request) => request.body,
        context: () => undefined,
      }),
    );
    try {
      const accepted = await server.inject({
        method: "POST",
        url: "/sync",
        payload: { id: "x" },
      });
      expect(accepted.statusCode).toBe(201);
      expect(accepted.headers["x-example"]).toBe("echo");
      expect(accepted.json()).toEqual({ label: "x" });
      const rejected = await server.inject({
        method: "POST",
        url: "/sync",
        payload: { id: "" },
      });
      expect(rejected.statusCode).toBe(400);
    } finally {
      await server.close();
    }
  });

  it("uses actual request parsing, awaits context and work, and retains strict input acceptance", async () => {
    let calls = 0;
    const lookup = asyncOperation({
      name: "Lookup",
      input,
      output,
      async perform({ id }, context: { prefix: string }) {
        calls++;
        return await Promise.resolve({ label: context.prefix + id });
      },
    });
    const server = Fastify();
    server.post(
      "/lookup",
      operationHandler(lookup, {
        input: (request) => request.body,
        context: () => Promise.resolve({ prefix: "Found " }),
      }),
    );
    try {
      const accepted = await server.inject({
        method: "POST",
        url: "/lookup",
        payload: { id: "x" },
      });
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json()).toEqual({ label: "Found x" });
      for (const payload of [
        { id: "" },
        { id: 42 },
        { id: "x", extra: true },
        {},
      ]) {
        const rejected = await server.inject({
          method: "POST",
          url: "/lookup",
          payload,
        });
        expect(rejected.statusCode).toBe(400);
        expect(rejected.json()).toMatchObject({ code: "REPRESENT_INPUT" });
      }
      expect(calls).toBe(1);
    } finally {
      await server.close();
    }
  });
  it("keeps output and execution failures with the server error policy", async () => {
    const invalid = asyncOperation({
      name: "Invalid output",
      input,
      output,
      perform: () => Promise.resolve({ label: "" }),
    });
    const unavailable = operation({
      name: "Unavailable",
      input,
      output,
      perform() {
        throw new Error("Offline");
      },
    });
    const server = Fastify();
    server.setErrorHandler((error, _request, reply) =>
      reply
        .code(503)
        .send({ error: error instanceof Error ? error.message : "Failed" }),
    );
    for (const [url, subject] of [
      ["/invalid", invalid],
      ["/unavailable", unavailable],
    ] as const)
      server.post(
        url,
        operationHandler(subject, {
          input: (request) => request.body,
          context: () => undefined,
        }),
      );
    try {
      const invalidResponse = await server.inject({
        method: "POST",
        url: "/invalid",
        payload: { id: "x" },
      });
      expect(invalidResponse.statusCode).toBe(503);
      expect(invalidResponse.json()).toHaveProperty(
        "error",
        expect.stringContaining("output"),
      );
      const unavailableResponse = await server.inject({
        method: "POST",
        url: "/unavailable",
        payload: { id: "x" },
      });
      expect(unavailableResponse.statusCode).toBe(503);
      expect(unavailableResponse.json()).toHaveProperty(
        "error",
        expect.stringContaining("perform"),
      );
    } finally {
      await server.close();
    }
  });
});
