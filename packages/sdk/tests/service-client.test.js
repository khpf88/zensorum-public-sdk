const assert = require("node:assert/strict");
const test = require("node:test");
const { createZensorumServiceClient, ZensorumServiceError } = require("../dist/service-client.js");
function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}
test("posts governed response to the platform release endpoint", async () => {
  let captured;
  const client = createZensorumServiceClient({
    baseUrl: "https://zensorum.example.test/",
    headers: { Authorization: "Bearer server-only-token" },
    fetch: async (url, init) => { captured = { url, init }; return jsonResponse({ released: true }); },
  });
  const result = await client.executeGovernedResponse({
    outputAdapterId: "consumer-web",
    request: { actorId: "actor-1", inputAdapterId: "consumer-input", action: "provide-guidance",
      input: { question: "What is the next step?" }, correlationId: "corr-1", idempotencyKey: "idem-1" },
    policy: { policyId: "policy-1" }, authority: { authorityId: "authority-1" },
  });
  assert.equal(captured.url, "https://zensorum.example.test/api/output/response");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.Authorization, "Bearer server-only-token");
  assert.equal(captured.init.headers["Content-Type"], "application/json");
  assert.equal(JSON.parse(captured.init.body).outputAdapterId, "consumer-web");
  assert.equal(result.released, true);
});
test("preserves HTTP 403 as a governed blocked result", async () => {
  const client = createZensorumServiceClient({
    baseUrl: "https://zensorum.example.test",
    fetch: async () => jsonResponse({ released: false, response: { status: "blocked" },
      evidence: { evidenceId: "evidence-1" } }, 403),
  });
  const result = await client.executeGovernedResponse({
    outputAdapterId: "consumer-web",
    request: { actorId: "actor-1", inputAdapterId: "consumer-input", action: "restricted-action" },
    policy: {}, authority: {},
  });
  assert.equal(result.released, false);
  assert.deepEqual(result.response, { status: "blocked" });
  assert.deepEqual(result.evidence, { evidenceId: "evidence-1" });
});
test("turns non-success technical responses into structured errors", async () => {
  const client = createZensorumServiceClient({
    baseUrl: "https://zensorum.example.test",
    fetch: async () => jsonResponse({ error: "Persistence is not configured." }, 503),
  });
  await assert.rejects(
    () => client.canonicalizeRequest({ actorId: "actor-1", inputAdapterId: "consumer-input", action: "test" }),
    (error) => {
      assert.ok(error instanceof ZensorumServiceError);
      assert.equal(error.status, 503);
      assert.equal(error.endpoint, "/api/execution-request");
      assert.equal(error.message, "Persistence is not configured.");
      return true;
    },
  );
});
test("URL-encodes request IDs and selects replay-verification mode", async () => {
  const urls = [];
  const client = createZensorumServiceClient({
    baseUrl: "https://zensorum.example.test",
    fetch: async (url) => { urls.push(String(url)); return jsonResponse({ evidence: [] }); },
  });
  await client.evidence("req / 1");
  await client.reconstruct("req / 1");
  await client.verifyReplay("req / 1");
  assert.equal(urls[0], "https://zensorum.example.test/api/evidence?requestId=req+%2F+1");
  assert.equal(urls[1], "https://zensorum.example.test/api/reconstruction?requestId=req+%2F+1");
  assert.equal(urls[2], "https://zensorum.example.test/api/reconstruction?requestId=req+%2F+1&mode=replay-verification");
});
test("rejects invalid service URLs and empty request IDs", () => {
  assert.throws(() => createZensorumServiceClient({ baseUrl: "file:///tmp/zensorum" }), /HTTP or HTTPS/);
  const client = createZensorumServiceClient({
    baseUrl: "https://zensorum.example.test", fetch: async () => jsonResponse({ evidence: [] }),
  });
  assert.throws(() => client.evidence(" "), /requestId/);
  assert.throws(() => client.verifyReplay(""), /requestId/);
});
