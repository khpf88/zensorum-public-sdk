/**
 * Zensorum Public SDK
 *
 * Public developer contracts and reference implementation.
 *
 * The SDK intentionally does not expose Zensorum's private
 * execution engine, persistence, governance infrastructure,
 * replay, reconstruction, or runtime internals.
 */

export interface Institution {
  readonly id: string;
  readonly name: string;
}

export interface ScenarioStage {
  readonly id: string;
  readonly mandatory?: boolean;
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly stages: readonly ScenarioStage[];
}

export interface InstitutionalInput<TPayload = unknown> {
  readonly id: string;
  readonly source: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
}

export interface AIInput<TRecommendation = unknown> {
  readonly source: string;
  readonly recommendation: TRecommendation;
}

export interface Policy {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly specification: unknown;
}

export interface Governance {
  readonly policies: readonly Policy[];
}

export interface Authority {
  readonly id: string;
  readonly name: string;
}

export interface Capability<TInput = unknown> {
  readonly name: string;
  readonly execute: (input: TInput) => Promise<unknown> | unknown;
}

export interface ExecutionRequest<
  TContext = unknown,
  TRecommendation = unknown
> {
  readonly institution: Institution;
  readonly scenario: Scenario;
  readonly context: TContext;
  readonly aiInput: AIInput<TRecommendation>;
  readonly governance: Governance;
  readonly authority: Authority;
  readonly capabilities: readonly Capability[];
}

export interface ExecutionDecision {
  readonly status: "approved" | "blocked" | "escalated";
  readonly reason: string;
}

export interface ExecutionOutcome {
  readonly status: "completed" | "not-executed" | "failed";
}

export interface ExecutionAction {
  readonly capability?: string;
  readonly status: "executed" | "not-executed";
  readonly result?: unknown;
}

export interface ExecutionEvidence {
  readonly available: boolean;
}

export interface ExecutionResult {
  readonly executionId: string;
  readonly institutionId: string;
  readonly scenarioId: string;
  readonly context: unknown;
  readonly aiInput: AIInput;
  readonly decision: ExecutionDecision;
  readonly action: ExecutionAction;
  readonly outcome: ExecutionOutcome;
  readonly evidence: ExecutionEvidence;
}

export interface ReevaluationRequest {
  readonly execution: ExecutionResult;
  readonly context: unknown;
  readonly aiInput: AIInput;
  readonly governance: Governance;
  readonly authority: Authority;
  readonly capabilities: readonly Capability[];
}

export interface InstitutionalHistory {
  readonly institutionId: string;
  readonly scenarioId: string;
  readonly executions: readonly ExecutionResult[];
}

export interface ZensorumClient {
  execute<TContext = unknown, TRecommendation = unknown>(
    request: ExecutionRequest<TContext, TRecommendation>
  ): Promise<ExecutionResult>;

  reevaluate<TContext = unknown, TRecommendation = unknown>(
    request: ReevaluationRequest
  ): Promise<ExecutionResult>;

  history(input: {
    institution: Institution;
    scenario: Scenario;
  }): Promise<InstitutionalHistory>;
}

export interface Zensorum {
  institution(input: {
    id: string;
    name: string;
  }): Institution;

  scenario(input: {
    id: string;
    name: string;
    version: string;
    stages: readonly ScenarioStage[];
  }): Scenario;

  governance(input: {
    policies: readonly Policy[];
  }): Governance;

  authority(input: {
    id: string;
    name: string;
  }): Authority;

  client(): ZensorumClient;
}

function createExecutionId(): string {
  return `execution-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function evaluateGovernance(
  request: ExecutionRequest
): ExecutionDecision {
  if (request.governance.policies.length === 0) {
    return {
      status: "blocked",
      reason: "No institutional governance policy was supplied.",
    };
  }

  if (request.authority.id.length === 0) {
    return {
      status: "blocked",
      reason: "No valid execution authority was supplied.",
    };
  }

  for (const policy of request.governance.policies) {
    const specification = policy.specification;

    if (
      typeof specification === "object" &&
      specification !== null &&
      "executionPermitted" in specification &&
      (specification as { executionPermitted?: unknown }).executionPermitted === false
    ) {
      return {
        status: "blocked",
        reason: `Execution is prohibited by institutional policy '${policy.id}'.`,
      };
    }

    if (
      typeof specification === "object" &&
      specification !== null &&
      "requiredCondition" in specification
    ) {
      const requiredCondition = (
        specification as { requiredCondition?: unknown }
      ).requiredCondition;

      const context = request.context;

      if (
        typeof context === "object" &&
        context !== null &&
        "operationalCondition" in context &&
        requiredCondition !==
          (context as {
            operationalCondition?: unknown;
          }).operationalCondition
      ) {
        return {
          status: "blocked",
          reason: `Institutional context does not satisfy policy '${policy.id}'.`,
        };
      }
    }

    if (
      typeof specification === "object" &&
      specification !== null &&
      "internalCapacityRequired" in specification
    ) {
      const required = (
        specification as { internalCapacityRequired?: unknown }
      ).internalCapacityRequired;

      const context = request.context;

      if (
        required === true &&
        typeof context === "object" &&
        context !== null &&
        "internalResponseCapacity" in context &&
        (context as {
          internalResponseCapacity?: unknown;
        }).internalResponseCapacity !== "available"
      ) {
        return {
          status: "blocked",
          reason: `Institutional context does not provide the required internal response capacity.`,
        };
      }
    }

    if (
      typeof specification === "object" &&
      specification !== null &&
      "externalCapacityRequired" in specification
    ) {
      const required = (
        specification as { externalCapacityRequired?: unknown }
      ).externalCapacityRequired;

      const context = request.context;

      if (
        required === true &&
        typeof context === "object" &&
        context !== null &&
        "externalResponseCapacity" in context &&
        (context as {
          externalResponseCapacity?: unknown;
        }).externalResponseCapacity !== "available"
      ) {
        return {
          status: "blocked",
          reason: `Institutional context does not provide the required external response capacity.`,
        };
      }
    }
  }

  return {
    status: "approved",
    reason: "Execution satisfies the supplied institutional governance boundary.",
  };
}

function createClient(): ZensorumClient {
  const executions: ExecutionResult[] = [];

  async function execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const executionId = createExecutionId();
    const decision = evaluateGovernance(request);

    if (decision.status !== "approved") {
      const result: ExecutionResult = {
        executionId,
        institutionId: request.institution.id,
        scenarioId: request.scenario.id,
        context: request.context,
        aiInput: request.aiInput,
        decision,
        action: {
          status: "not-executed",
        },
        outcome: {
          status: "not-executed",
        },
        evidence: {
          available: true,
        },
      };

      executions.push(result);
      return result;
    }

    const capability = request.capabilities[0];

    if (!capability) {
      const result: ExecutionResult = {
        executionId,
        institutionId: request.institution.id,
        scenarioId: request.scenario.id,
        context: request.context,
        aiInput: request.aiInput,
        decision: {
          status: "blocked",
          reason: "No application capability was supplied for governed execution.",
        },
        action: {
          status: "not-executed",
        },
        outcome: {
          status: "not-executed",
        },
        evidence: {
          available: true,
        },
      };

      executions.push(result);
      return result;
    }

    try {
      const resultValue = await capability.execute(request.aiInput.recommendation);

      const result: ExecutionResult = {
        executionId,
        institutionId: request.institution.id,
        scenarioId: request.scenario.id,
        context: request.context,
        aiInput: request.aiInput,
        decision,
        action: {
          capability: capability.name,
          status: "executed",
          result: resultValue,
        },
        outcome: {
          status: "completed",
        },
        evidence: {
          available: true,
        },
      };

      executions.push(result);
      return result;
    } catch {
      const result: ExecutionResult = {
        executionId,
        institutionId: request.institution.id,
        scenarioId: request.scenario.id,
        context: request.context,
        aiInput: request.aiInput,
        decision,
        action: {
          capability: capability.name,
          status: "not-executed",
        },
        outcome: {
          status: "failed",
        },
        evidence: {
          available: true,
        },
      };

      executions.push(result);
      return result;
    }
  }

  return {
    async execute(request) {
      return execute(request);
    },

    async reevaluate(request) {
      return execute({
        institution: {
          id: request.execution.institutionId,
          name: request.execution.institutionId,
        },
        scenario: {
          id: request.execution.scenarioId,
          name: request.execution.scenarioId,
          version: "1.0",
          stages: [],
        },
        context: request.context,
        aiInput: request.aiInput,
        governance: request.governance,
        authority: request.authority,
        capabilities: request.capabilities,
      });
    },

    async history({ institution, scenario }) {
      return {
        institutionId: institution.id,
        scenarioId: scenario.id,
        executions: executions.filter(
          (execution) =>
            execution.institutionId === institution.id &&
            execution.scenarioId === scenario.id
        ),
      };
    },
  };
}

export function createZensorum(): Zensorum {
  return {
    institution(input) {
      return Object.freeze({
        id: input.id,
        name: input.name,
      });
    },

    scenario(input) {
      return Object.freeze({
        id: input.id,
        name: input.name,
        version: input.version,
        stages: Object.freeze([...input.stages]),
      });
    },

    governance(input) {
      return Object.freeze({
        policies: Object.freeze([...input.policies]),
      });
    },

    authority(input) {
      return Object.freeze({
        id: input.id,
        name: input.name,
      });
    },

    client() {
      return createClient();
    },
  };
}
