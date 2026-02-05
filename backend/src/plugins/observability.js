import fp from "fastify-plugin";

const observabilityPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    request.requestStartTime = Date.now();
    reply.header("x-request-id", request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    const durationMs = Date.now() - Number(request.requestStartTime ?? Date.now());
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs
      },
      "request_completed"
    );
  });
});

export default observabilityPlugin;
