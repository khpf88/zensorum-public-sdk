# API Reference

This document describes the public TypeScript contract exposed by `@zensorum/sdk`.

The API is intentionally small. It defines the application-facing boundary for institutional context, governance, authority, governed execution, reevaluation, and history.

## Import

```ts id="8h8k3v"
import { createZensorum } from "@zensorum/sdk";
```

## `createZensorum()`

Creates a Zensorum SDK instance.

```ts id="q8p3dm"
const zensorum = createZensorum();
```

The returned object exposes the public SDK factories and client boundary.

## `Zensorum`

```ts id="k7r2n4"
interface Zensorum {
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
```

### `institution()`

Creates an institutional identity.

```ts id="p5x4hs"
const institution = zensorum.institution({
  id: "acme-operations",
  name: "Acme Operations",
});
```

### `scenario()`

Creates a versioned scenario definition.

```ts id="t3m8qv"
const scenario = zensorum.scenario({
  id: "service-response",
  name: "Service Response",
  version: "1.0.0",
  stages: [
    {
      id: "assess",
      mandatory: true,
    },
    {
      id: "respond",
      mandatory: true,
    },
  ],
});
```

### `governance()`

Creates the governance input for an execution request.

```ts id="v6r9cp"
const governance = zensorum.governance({
  policies: [
    {
      id: "response-policy",
      name: "Response Policy",
      version: "1.0.0",
      specification: {},
    },
  ],
});
```

The policy `specification` is intentionally typed as `unknown`. The public SDK does not impose a universal institutional policy language.

### `authority()`

Creates the authority associated with an execution.

```ts id="j2d7kw"
const authority = zensorum.authority({
  id: "operations-manager",
  name: "Operations Manager",
});
```

### `client()`

Creates a client implementing the public execution contract.

```ts id="n5s4ya"
const client = zensorum.client();
```

## `Institution`

```ts id="b8p2jf"
interface Institution {
  readonly id: string;
  readonly name: string;
}
```

Represents the institutional boundary for execution.

## `Scenario`

```ts id="m4c6zt"
interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly stages: readonly ScenarioStage[];
}
```

A scenario identifies the institutional situation or workflow being executed.

## `ScenarioStage`

```ts id="h7v3qn"
interface ScenarioStage {
  readonly id: string;
  readonly mandatory?: boolean;
}
```

Represents a stage within a scenario.

## `InstitutionalInput`

```ts id="r9w5kd"
interface InstitutionalInput<TPayload = unknown> {
  readonly id: string;
  readonly source: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
}
```

Represents information entering the institutional execution process.

The payload is generic so applications can supply their own domain-specific data.

## `AIInput`

```ts id="c6y2mp"
interface AIInput<TRecommendation = unknown> {
  readonly source: string;
  readonly recommendation: TRecommendation;
}
```

Represents an AI-generated recommendation or proposed action.

The recommendation is an execution input, not execution authority.

## `Policy`

```ts id="f3q8rx"
interface Policy {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly specification: unknown;
}
```

Represents an institutional policy.

The `specification` field is deliberately implementation-neutral.

## `Governance`

```ts id="u4n7vb"
interface Governance {
  readonly policies: readonly Policy[];
}
```

Represents the governance supplied for an execution request.

## `Authority`

```ts id="s8k3dc"
interface Authority {
  readonly id: string;
  readonly name: string;
}
```

Identifies the institutional authority associated with an execution.

## `Capability`

```ts id="q5m9za"
interface Capability<TInput = unknown> {
  readonly name: string;
  readonly execute: (input: TInput) => Promise<unknown> | unknown;
}
```

Represents an application-owned action that may be executed when permitted.

The application controls the implementation of the capability.

## `ExecutionRequest`

```ts id="d7p4hx"
interface ExecutionRequest<
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
```

Defines the complete application-facing request for governed execution.

### Generic parameters

`TContext`

The application-defined institutional context type.

`TRecommendation`

The application-defined AI recommendation type.

`TPayload`

The application-defined institutional input payload type.

## `ExecutionDecision`

```ts id="e2k6wr"
interface ExecutionDecision {
  readonly status: "approved" | "blocked";
  readonly reason: string;
}
```

Represents the execution decision.

The current public contract exposes two decision states:

* `approved`
* `blocked`

## `ExecutionAction`

```ts id="a9c5zn"
interface ExecutionAction {
  readonly capability?: string;
  readonly status: "executed" | "not-executed";
  readonly result?: unknown;
}
```

Describes the application capability execution result.

## `ExecutionOutcome`

```ts id="w3h7ps"
interface ExecutionOutcome {
  readonly status: "completed" | "not-executed" | "failed";
}
```

Represents the overall execution outcome.

## `ExecutionEvidence`

```ts id="k6t4yv"
interface ExecutionEvidence {
  readonly available: boolean;
}
```

Indicates whether execution evidence is available through the result projection.

The public contract intentionally does not expose the underlying evidence-generation implementation.

## `ExecutionResult`

```ts id="z8r2mc"
interface ExecutionResult<
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
```

Represents the result of a governed execution.

`previousExecutionId` is populated when the execution is a reevaluation linked to an earlier execution.

## `ReevaluationRequest`

```ts id="p7d5fj"
interface ReevaluationRequest<
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
```

Defines a new evaluation using a previous execution as the continuity reference.

The new context and AI input allow the application to reevaluate institutional execution as conditions change.

## `InstitutionalHistory`

```ts id="v5n8qa"
interface InstitutionalHistory {
  readonly institutionId: string;
  readonly scenarioId: string;
  readonly executions: readonly ExecutionResult[];
}
```

Represents the execution history associated with an institution and scenario.

## `ZensorumClient`

```ts id="x4m7bc"
interface ZensorumClient {
  execute<TContext = unknown, TRecommendation = unknown, TPayload = unknown>(
    request: ExecutionRequest<TContext, TRecommendation, TPayload>
  ): Promise<ExecutionResult<TContext, TRecommendation>>;

  reevaluate<TContext = unknown, TRecommendation = unknown, TPayload = unknown>(
    request: ReevaluationRequest<TContext, TRecommendation, TPayload>
  ): Promise<ExecutionResult<TContext, TRecommendation>>;

  history(input: {
    institution: Institution;
    scenario: Scenario;
  }): Promise<InstitutionalHistory>;
}
```

### `execute()`

Submits an execution request.

```ts id="n2j8sv"
const result = await client.execute({
  institution,
  scenario,
  context,
  aiInput,
  governance,
  authority,
  capabilities,
});
```

### `reevaluate()`

Evaluates a new state using an existing execution as the continuity reference.

```ts id="q6c4mw"
const result = await client.reevaluate({
  execution: previousResult,
  context: newContext,
  aiInput: newAIInput,
  governance,
  authority,
  capabilities,
});
```

### `history()`

Retrieves execution history for an institution and scenario.

```ts id="r8p5yk"
const history = await client.history({
  institution,
  scenario,
});
```

## Generic context and recommendation types

The SDK does not prescribe the structure of institutional context or AI recommendations.

Applications can define their own types:

```ts id="f7v3qa"
type OperationalContext = {
  operationalCondition: "normal" | "degraded" | "critical";
  internalResponseCapacity: "available" | "exhausted";
};

type ResponseRecommendation = {
  action: "activate";
  resourceType: "internal" | "external";
};
```

Those types can then flow through the execution request and result:

```ts id="m9c2wd"
const request: ExecutionRequest<
  OperationalContext,
  ResponseRecommendation
> = {
  institution,
  scenario,
  context: {
    operationalCondition: "degraded",
    internalResponseCapacity: "available",
  },
  aiInput: {
    source: "operations-ai",
    recommendation: {
      action: "activate",
      resourceType: "internal",
    },
  },
  governance,
  authority,
  capabilities: [
    {
      name: "activate-response-resource",
      execute: async (recommendation) => {
        return {
          activated: recommendation.action === "activate",
        };
      },
    },
  ],
};
```

## Public API boundary

The public SDK intentionally exposes contracts rather than implementation details.

Applications should depend on:

```text id="c3m7va"
Application
    ↓
@zensorum/sdk
    ↓
Zensorum implementation
```

The SDK does not expose:

* internal persistence
* database implementation
* private runtime components
* internal evidence construction
* replay implementation
* reconstruction implementation
* internal governance enforcement
* internal execution pipeline composition

These implementation concerns remain behind the public boundary.

## Compatibility and evolution

The SDK is currently in pre-release development.

Applications should treat the public interfaces as the intended developer contract while recognizing that APIs may evolve before the first public release.
