# Service-backed client

The public SDK includes createZensorumServiceClient(), an HTTP client for existing Zensorum platform endpoints. It is additive: createZensorum().client() remains the local, in-memory reference implementation for demos and tests.

## Security boundary

**Use this client from a trusted server-side application backend.** Do not put privileged service credentials in browser bundles, Android application packages, or other client-distributed code. The SDK can attach caller-supplied headers, but it does not itself establish authentication or authorization on the deployed platform. Before exposing the service to end users, verify that the deployed platform or a trusted gateway authenticates callers and enforces application, tenant, and environment scope.

The client transports requests; it does not recreate platform governance. Only a response from the authoritative service can be treated as a platform result.

## Configure

~~~ts
import { createZensorumServiceClient } from "@zensorum/sdk/service";

const zensorum = createZensorumServiceClient({
  baseUrl: process.env.ZENSORUM_SERVICE_URL!,
  headers: {
    Authorization: `Bearer ${process.env.ZENSORUM_SERVICE_TOKEN!}`,
  },
  timeoutMs: 15_000,
});
~~~

Keep secrets in server-side environment variables. Never compile them into a web or mobile client. Configure the URL and credentials according to your deployment's security boundary.

## Submit a governed response

The platform's /api/output/response endpoint is the current end-to-end governed response operation. It canonicalizes the request, evaluates policy and authority, creates a governed outcome, checks the output adapter, and persists response evidence and lineage.

~~~ts
const result = await zensorum.executeGovernedResponse({
  outputAdapterId: "your-registered-output-adapter",
  request: {
    actorId: "your-registered-actor",
    inputAdapterId: "your-registered-input-adapter",
    action: "your-domain-action",
    input: { question: "What is the next step?" },
    metadata: {},
    correlationId: "correlation-id-from-your-application",
    idempotencyKey: "stable-key-for-this-logical-request",
  },
  policy: { /* platform policy contract */ },
  authority: { /* platform authority contract */ },
});

if (result.released === true) {
  // The platform reports that the governed response was released.
} else if (result.released === false) {
  // The platform reports a blocked response; inspect response and evidence.
}
~~~

Replace the example actor, input adapter, output adapter, policy, and authority with valid records configured for the target platform context. This SDK does not create or provision those records.

A blocked response may be returned with HTTP 403; the SDK preserves that endpoint's JSON body so the caller can inspect the governed result. Other non-success HTTP statuses throw ZensorumServiceError, which includes status, endpoint, and parsed response body. Do not automatically retry non-idempotent POST requests unless the service contract explicitly guarantees idempotency.

## Available platform operations

| Method | Endpoint | Purpose |
|---|---|---|
| canonicalizeRequest(input) | POST /api/execution-request | Validate and canonicalize a request |
| evaluateGovernance(input) | POST /api/governance/evaluate | Evaluate policy and authority |
| createGovernedOutcome(input) | POST /api/governed-outcome | Produce the governed outcome |
| executeGovernedResponse(input) | POST /api/output/response | Governed response flow with evidence/lineage |
| evidence(requestId) | GET /api/evidence?requestId=... | Retrieve persisted evidence |
| reconstruct(requestId) | GET /api/reconstruction?requestId=... | Reconstruct persisted execution evidence |
| verifyReplay(requestId) | GET /api/reconstruction?mode=replay-verification&requestId=... | Verify replay for persisted evidence |

The endpoint response envelopes reflect current platform HTTP contracts and may evolve. Evidence, reconstruction, and replay require persisted evidence and an appropriately configured platform runtime.

## Error handling

~~~ts
import {
  createZensorumServiceClient,
  ZensorumServiceError,
} from "@zensorum/sdk/service";

try {
  const result = await zensorum.executeGovernedResponse(input);
  // Inspect result.released and returned outcome/evidence.
} catch (error) {
  if (error instanceof ZensorumServiceError) {
    console.error(error.status, error.endpoint, error.message);
  }
  throw error;
}
~~~

The client has a configurable request timeout (15 seconds by default), accepts an injectable fetch implementation for tests, and does not automatically retry requests.

## Current limitation

This is an HTTP integration layer over existing endpoints, not a claim that the deployed service is production-ready for arbitrary external consumers. The platform endpoints inspected use server-side runtime execution context; caller authentication and request-scoped authorization must be verified or added at the platform/gateway boundary before public consumer traffic is enabled. A live integration test against the deployed environment is also still required.
