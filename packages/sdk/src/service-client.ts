/**
 * Service-backed client for the public Zensorum platform HTTP endpoints.
 * Governance and execution remain authoritative only when performed by the service.
 */
export interface InstitutionalExecutionRequestInput {
  readonly requestId?: string;
  readonly actorId: string;
  readonly inputAdapterId: string;
  readonly action: string;
  readonly input?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
  readonly requestedAt?: string;
  readonly organizationId?: string;
  readonly tenantId?: string;
}
export interface GovernanceEvaluationInput {
  readonly request: InstitutionalExecutionRequestInput;
  readonly policy: unknown;
  readonly authority: unknown;
}
export interface GovernedResponseInput extends GovernanceEvaluationInput {
  readonly outputAdapterId: string;
}
export interface PlatformEndpointResponse {
  readonly [key: string]: unknown;
  readonly error?: string;
  readonly errors?: readonly unknown[];
  readonly accepted?: boolean;
  readonly evaluated?: boolean;
  readonly governed?: boolean;
  readonly released?: boolean;
  readonly request?: unknown;
  readonly governance?: unknown;
  readonly outcome?: unknown;
  readonly response?: unknown;
  readonly evidence?: unknown;
  readonly lineage?: unknown;
  readonly reconstruction?: unknown;
  readonly replay?: unknown;
}
export interface ZensorumServiceClientOptions {
  readonly baseUrl: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
}
export interface ZensorumServiceClient {
  canonicalizeRequest(input: InstitutionalExecutionRequestInput): Promise<PlatformEndpointResponse>;
  evaluateGovernance(input: GovernanceEvaluationInput): Promise<PlatformEndpointResponse>;
  createGovernedOutcome(input: GovernanceEvaluationInput): Promise<PlatformEndpointResponse>;
  executeGovernedResponse(input: GovernedResponseInput): Promise<PlatformEndpointResponse>;
  evidence(requestId: string): Promise<PlatformEndpointResponse>;
  reconstruct(requestId: string): Promise<PlatformEndpointResponse>;
  verifyReplay(requestId: string): Promise<PlatformEndpointResponse>;
}
export class ZensorumServiceError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly body: unknown;
  constructor(message: string, status: number, endpoint: string, body?: unknown) {
    super(message);
    this.name = "ZensorumServiceError";
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function endpointErrorMessage(body: unknown, status: number): string {
  if (isRecord(body) && typeof body.error === "string" && body.error.trim()) return body.error;
  return `Zensorum service request failed with HTTP ${status}.`;
}
function validateOptions(options: ZensorumServiceClientOptions): {
  baseUrl: string; fetchImpl: typeof globalThis.fetch; timeoutMs: number;
} {
  if (typeof options.baseUrl !== "string" || !options.baseUrl.trim()) {
    throw new TypeError("A non-empty Zensorum service baseUrl is required.");
  }
  let parsed: URL;
  try { parsed = new URL(options.baseUrl); }
  catch { throw new TypeError("Zensorum service baseUrl must be an absolute URL."); }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new TypeError("Zensorum service baseUrl must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new TypeError("Zensorum service baseUrl must not contain credentials, query parameters, or a fragment.");
  }
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs must be a positive integer.");
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required for the Zensorum service client.");
  }
  return { baseUrl: options.baseUrl.replace(/\/+$/, ""), fetchImpl, timeoutMs };
}
/**
 * Use from a trusted backend until caller authentication and authorization have
 * been verified at the deployed service or gateway boundary. Never ship
 * privileged service credentials in browser or mobile application bundles.
 */
export function createZensorumServiceClient(options: ZensorumServiceClientOptions): ZensorumServiceClient {
  const validated = validateOptions(options);
  const extraHeaders = options.headers ?? {};
  async function request(
    endpoint: string,
    init: RequestInit = {},
    acceptedStatuses: readonly number[] = [],
  ): Promise<PlatformEndpointResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), validated.timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json", ...extraHeaders };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    if (init.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
      Object.assign(headers, init.headers);
    }
    try {
      const response = await validated.fetchImpl(`${validated.baseUrl}${endpoint}`, {
        ...init, headers, signal: controller.signal,
      });
      const text = await response.text();
      let body: unknown;
      try { body = text.length > 0 ? JSON.parse(text) : {}; }
      catch {
        throw new ZensorumServiceError(
          "Zensorum service returned a non-JSON response.", response.status, endpoint, text,
        );
      }
      const acceptedGovernedBlock =
        endpoint === "/api/output/response" &&
        response.status === 403 &&
        isRecord(body) &&
        body.released === false;
      if (
        !response.ok &&
        !(acceptedStatuses.includes(response.status) && acceptedGovernedBlock)
      ) {
        throw new ZensorumServiceError(
          endpointErrorMessage(body, response.status), response.status, endpoint, body,
        );
      }
      if (!isRecord(body)) {
        throw new ZensorumServiceError(
          "Zensorum service returned an unexpected response shape.", response.status, endpoint, body,
        );
      }
      return body as PlatformEndpointResponse;
    } catch (error) {
      if (error instanceof ZensorumServiceError) throw error;
      if (controller.signal.aborted) {
        throw new ZensorumServiceError(
          `Zensorum service request timed out after ${validated.timeoutMs} ms.`, 0, endpoint,
        );
      }
      throw new ZensorumServiceError(
        error instanceof Error ? error.message : "Zensorum service request failed.", 0, endpoint,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  function post(endpoint: string, body: unknown, acceptedStatuses: readonly number[] = []) {
    return request(endpoint, { method: "POST", body: JSON.stringify(body) }, acceptedStatuses);
  }
  function requestQuery(requestId: string, mode?: "replay-verification"): string {
    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new TypeError("requestId must be a non-empty string.");
    }
    const params = new URLSearchParams({ requestId: requestId.trim() });
    if (mode) params.set("mode", mode);
    return params.toString();
  }
  return {
    canonicalizeRequest(input) { return post("/api/execution-request", input); },
    evaluateGovernance(input) { return post("/api/governance/evaluate", input); },
    createGovernedOutcome(input) { return post("/api/governed-outcome", input); },
    executeGovernedResponse(input) {
      // HTTP 403 is a valid blocked outcome for this endpoint; preserve its JSON body.
      return post("/api/output/response", input, [403]);
    },
    evidence(requestId) { return request(`/api/evidence?${requestQuery(requestId)}`); },
    reconstruct(requestId) { return request(`/api/reconstruction?${requestQuery(requestId)}`); },
    verifyReplay(requestId) {
      return request(`/api/reconstruction?${requestQuery(requestId, "replay-verification")}`);
    },
  };
}
