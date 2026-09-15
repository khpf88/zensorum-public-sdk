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

export type PolicyConditionOperator =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte";

export interface PolicyCondition {
  readonly path: string;
  readonly operator: PolicyConditionOperator;
  readonly value: string | number | boolean | null;
}

export interface PolicySpecification {
  readonly all?: readonly PolicyCondition[];
  readonly executionPermitted?: boolean;
  readonly requiredCondition?: string;
  readonly internalCapacityRequired?: boolean;
  readonly externalCapacityRequired?: boolean;
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
  TRecommendation = unknown,
  TPayload = unknown
> {
  readonly institution: Institution;
  readonly scenario: Scenario;
  readonly context: TContext;
  readonly institutionalInputs?: readonly InstitutionalInput<TPayload>[];
  readonly aiInput: AIInput<TRecommendation>;
  readonly governance: Governance;
  readonly authority: Authority;
  readonly capabilities: readonly Capability<TRecommendation>[];
}

export interface ExecutionDecision {
  readonly status: "approved" | "blocked";
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

export interface ExecutionResult<
  TContext = unknown,
  TRecommendation = unknown
> {
  readonly executionId: string;
  readonly institutionId: string;
  readonly scenarioId: string;
  readonly context: TContext;
  readonly aiInput: AIInput<TRecommendation>;
  readonly decision: ExecutionDecision;
  readonly action: ExecutionAction;
  readonly outcome: ExecutionOutcome;
  readonly evidence: ExecutionEvidence;
  readonly previousExecutionId?: string;
}

export interface ReevaluationRequest<
  TContext = unknown,
  TRecommendation = unknown,
  TPayload = unknown
> {
  readonly execution: ExecutionResult<TContext, TRecommendation>;
  readonly context: TContext;
  readonly institutionalInputs?: readonly InstitutionalInput<TPayload>[];
  readonly aiInput: AIInput<TRecommendation>;
  readonly governance: Governance;
  readonly authority: Authority;
  readonly capabilities: readonly Capability<TRecommendation>[];
}

export interface InstitutionalHistory {
  readonly institutionId: string;
  readonly scenarioId: string;
  readonly executions: readonly ExecutionResult[];
}

export interface ZensorumClient {
  execute<
    TContext = unknown,
    TRecommendation = unknown,
    TPayload = unknown
  >(
    request: ExecutionRequest<TContext, TRecommendation, TPayload>
  ): Promise<ExecutionResult<TContext, TRecommendation>>;

  reevaluate<
    TContext = unknown,
    TRecommendation = unknown,
    TPayload = unknown
  >(
    request: ReevaluationRequest<TContext, TRecommendation, TPayload>
  ): Promise<ExecutionResult<TContext, TRecommendation>>;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readContextValue(context: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  const segments = path.split(".");
  let current: unknown = context;

  for (const segment of segments) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function evaluateCondition(
  context: unknown,
  condition: PolicyCondition
): boolean {
  const actual = readContextValue(context, condition.path);

  if (actual === undefined) {
    return false;
  }

  switch (condition.operator) {
    case "eq":
      return actual === condition.value;

    case "neq":
      return actual !== condition.value;

    case "lt":
      return (
        typeof actual === "number" &&
        typeof condition.value === "number" &&
        actual < condition.value
      );

    case "lte":
      return (
        typeof actual === "number" &&
        typeof condition.value === "number" &&
        actual <= condition.value
      );

    case "gt":
      return (
        typeof actual === "number" &&
        typeof condition.value === "number" &&
        actual > condition.value
      );

    case "gte":
      return (
        typeof actual === "number" &&
        typeof condition.value === "number" &&
        actual >= condition.value
      );

    default:
      return false;
  }
}

function evaluateContextualConditions(
  context: unknown,
  policyId: string,
  conditions: readonly PolicyCondition[]
): ExecutionDecision | undefined {
  for (const condition of conditions) {
    if (
      !condition.path ||
      !["eq", "neq", "lt", "lte", "gt", "gte"].includes(
        condition.operator
      )
    ) {
      return {
        status: "blocked",
        reason: `Invalid contextual governance condition in institutional policy '${policyId}'.`,
      };
    }

    if (!evaluateCondition(context, condition)) {
      return {
        status: "blocked",
        reason: `Institutional context does not satisfy policy '${policyId}' at '${condition.path}'.`,
      };
    }
  }

  return undefined;
}

function evaluateGovernance<
  TContext = unknown,
  TRecommendation = unknown,
  TPayload = unknown
>(
  request: ExecutionRequest<TContext, TRecommendation, TPayload>
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

    if (!isRecord(specification)) {
      continue;
    }

    if (
      "executionPermitted" in specification &&
      specification.executionPermitted === false
    ) {
      return {
        status: "blocked",
        reason: `Execution is prohibited by institutional policy '${policy.id}'.`,
      };
    }

    if ("all" in specification) {
      const conditions = specification.all;

      if (!Array.isArray(conditions)) {
        return {
          status: "blocked",
          reason: `Invalid contextual governance specification in institutional policy '${policy.id}'.`,
        };
      }

      const contextualDecision = evaluateContextualConditions(
        request.context,
        policy.id,
        conditions as PolicyCondition[]
      );

      if (contextualDecision) {
        return contextualDecision;
      }
    }

    if ("requiredCondition" in specification) {
      const requiredCondition = specification.requiredCondition;

      if (
        isRecord(request.context) &&
        Object.prototype.hasOwnProperty.call(
          request.context,
          "operationalCondition"
        ) &&
        requiredCondition !== request.context.operationalCondition
      ) {
        return {
          status: "blocked",
          reason: `Institutional context does not satisfy policy '${policy.id}'.`,
        };
      }
    }

    if ("internalCapacityRequired" in specification) {
      if (
        specification.internalCapacityRequired === true &&
        isRecord(request.context) &&
        Object.prototype.hasOwnProperty.call(
          request.context,
          "internalResponseCapacity"
        ) &&
        request.context.internalResponseCapacity !== "available"
      ) {
        return {
          status: "blocked",
          reason:
            "Institutional context does not provide the required internal response capacity.",
        };
      }
    }

    if ("externalCapacityRequired" in specification) {
      if (
        specification.externalCapacityRequired === true &&
        isRecord(request.context) &&
        Object.prototype.hasOwnProperty.call(
          request.context,
          "externalResponseCapacity"
        ) &&
        request.context.externalResponseCapacity !== "available"
      ) {
        return {
          status: "blocked",
          reason:
            "Institutional context does not provide the required external response capacity.",
        };
      }
    }
  }

  return {
    status: "approved",
    reason:
      "Execution satisfies the supplied institutional governance boundary.",
  };
}

interface ExecutionMetadata {
  readonly institution: Institution;
  readonly scenario: Scenario;
  readonly institutionalInputs: readonly InstitutionalInput[];
}

function createClient(): ZensorumClient {
  const executions: ExecutionResult[] = [];
  const metadata = new Map<string, ExecutionMetadata>();

  async function execute<
    TContext = unknown,
    TRecommendation = unknown,
    TPayload = unknown
  >(
    request: ExecutionRequest<TContext, TRecommendation, TPayload>,
    previousExecutionId?: string
  ): Promise<ExecutionResult<TContext, TRecommendation>> {
    const executionId = createExecutionId();
    const decision = evaluateGovernance(request);

    metadata.set(executionId, {
      institution: request.institution,
      scenario: request.scenario,
      institutionalInputs: request.institutionalInputs ?? [],
    });

    if (decision.status !== "approved") {
      const result: ExecutionResult<TContext, TRecommendation> = {
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
        ...(previousExecutionId
          ? { previousExecutionId }
          : {}),
      };

      executions.push(result);
      return result;
    }

    const capability = request.capabilities[0];

    if (!capability) {
      const result: ExecutionResult<TContext, TRecommendation> = {
        executionId,
        institutionId: request.institution.id,
        scenarioId: request.scenario.id,
        context: request.context,
        aiInput: request.aiInput,
        decision: {
          status: "blocked",
          reason:
            "No application capability was supplied for governed execution.",
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
        ...(previousExecutionId
          ? { previousExecutionId }
          : {}),
      };

      executions.push(result);
      return result;
    }

    try {
      const resultValue = await capability.execute(
        request.aiInput.recommendation
      );

      const result: ExecutionResult<TContext, TRecommendation> = {
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
        ...(previousExecutionId
          ? { previousExecutionId }
          : {}),
      };

      executions.push(result);
      return result;
    } catch {
      const result: ExecutionResult<TContext, TRecommendation> = {
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
        ...(previousExecutionId
          ? { previousExecutionId }
          : {}),
      };

      executions.push(result);
      return result;
    }
  }

  return {
    execute,

    async reevaluate(request) {
      const original = metadata.get(request.execution.executionId);

      if (original) {
        return execute(
          {
            institution: original.institution,
            scenario: original.scenario,
            context: request.context,
            institutionalInputs: request.institutionalInputs,
            aiInput: request.aiInput,
            governance: request.governance,
            authority: request.authority,
            capabilities: request.capabilities,
          },
          request.execution.executionId
        );
      }

      return execute(
        {
          institution: {
            id: request.execution.institutionId,
            name: request.execution.institutionId,
          },
          scenario: {
            id: request.execution.scenarioId,
            name: request.execution.scenarioId,
            version: "unknown",
            stages: [],
          },
          context: request.context,
          institutionalInputs: request.institutionalInputs,
          aiInput: request.aiInput,
          governance: request.governance,
          authority: request.authority,
          capabilities: request.capabilities,
        },
        request.execution.executionId
      );
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
      return {
        id: input.id,
        name: input.name,
      };
    },

    scenario(input) {
      return {
        id: input.id,
        name: input.name,
        version: input.version,
        stages: [...input.stages],
      };
    },

    governance(input) {
      return {
        policies: [...input.policies],
      };
    },

    authority(input) {
      return {
        id: input.id,
        name: input.name,
      };
    },

    client: createClient,
  };
}
