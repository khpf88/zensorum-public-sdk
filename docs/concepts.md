# Concepts

The Zensorum public SDK provides an application-facing contract for governed institutional execution.

The central idea is simple:

**AI can recommend an action, but institutional context, governance, authority, and execution rules determine whether that action may proceed.**

## Institutional execution

Traditional application flows often look like:

```text
Input → Application Logic → Action
```

An AI-assisted application may look like:

```text
Input → AI Recommendation → Action
```

Zensorum introduces an institutional execution boundary:

```text
Institutional Context
        ↓
Institutional Input
        ↓
AI Recommendation
        ↓
Governance + Authority
        ↓
Decision
        ↓
Application Capability
        ↓
Outcome + Evidence
        ↓
Institutional History
```

The purpose is not to replace the application's domain logic. The purpose is to govern the transition from recommendation to authorized execution.

## AI input is not execution authority

An AI system may identify a condition, recommend an action, or propose a course of action.

That recommendation is treated as an input:

```ts id="s4w2dm"
const aiInput = {
  source: "operations-ai",
  recommendation: "Activate response resource",
};
```

The application does not have to treat the AI recommendation as an executable command.

Instead, the recommendation enters the governed execution process together with institutional context, governance, and authority.

This separation is fundamental to the Zensorum model.

## Context-sensitive execution

The same recommendation can produce different execution results when institutional conditions change.

For example:

```text
Recommendation:
Activate response resource
```

Under one context:

```text
Condition: degraded
Internal capacity: available
```

The action may be approved.

Under another:

```text
Condition: critical
Internal capacity: exhausted
```

The same recommendation may be blocked.

The difference is not the AI recommendation. The difference is the institutional state against which the recommendation is evaluated.

## Governance

Governance represents the institutional policies that constrain execution.

The public SDK exposes a generic policy contract:

```ts id="e3qkw5"
const governance = zensorum.governance({
  policies: [
    {
      id: "response-policy",
      name: "Response Policy",
      version: "1.0.0",
      specification: {
        executionPermitted: true,
      },
    },
  ],
});
```

The SDK does not prescribe a universal policy language.

The `specification` field is intentionally generic. A service-backed Zensorum implementation can apply the institution's actual governance model behind the public contract.

The current local reference implementation recognizes a small demonstration policy specification. Those fields are examples for the reference implementation, not a definition of Zensorum's permanent governance language.

## Authority

Governance defines what is permitted. Authority identifies the institutional authority associated with the execution request.

```ts id="q1qz4j"
const authority = zensorum.authority({
  id: "operations-manager",
  name: "Operations Manager",
});
```

A governed execution therefore has both:

* institutional policy
* institutional authority

The combination provides an application-facing boundary for authorized execution.

## Capabilities

A capability represents an application-owned action that can be executed when the governed execution process permits it.

```ts id="x0z2v8"
const capability = {
  name: "activate-response-resource",
  execute: async (recommendation: string) => {
    return {
      activated: true,
      recommendation,
    };
  },
};
```

The capability remains owned by the application.

The application determines what the action actually does, including interactions with:

* databases
* APIs
* external systems
* devices
* enterprise applications
* domain-specific services

Zensorum provides the execution boundary around that capability.

## Evidence

Execution results expose an evidence projection:

```ts id="0svm9p"
console.log(result.evidence);
```

The public contract deliberately keeps this projection small.

The underlying evidence, provenance, lineage, and audit machinery can remain behind the service boundary while applications consume the public execution result.

## History and continuity

Institutional execution is not necessarily a collection of unrelated transactions.

A subsequent reevaluation can reference a previous execution:

```ts id="a4kqgc"
const reevaluated = await client.reevaluate({
  execution: result,
  context: newContext,
  aiInput: newAIInput,
  governance,
  authority,
  capabilities,
});
```

The resulting execution can identify its predecessor:

```ts id="w5kq3s"
console.log(reevaluated.previousExecutionId);
```

This creates an explicit continuity relationship between successive execution states.

Applications can also retrieve institutional history:

```ts id="b7nq2a"
const history = await client.history({
  institution,
  scenario,
});
```

This provides an application-facing view of how execution evolved over time.

## Institutional inputs

Applications can provide structured institutional inputs:

```ts id="j3s8kd"
const institutionalInput = {
  id: "input-001",
  source: "operations-system",
  occurredAt: new Date().toISOString(),
  payload: {
    condition: "degraded",
  },
};
```

Institutional inputs allow applications to provide information entering the execution process without prescribing a domain-specific data model.

The payload is intentionally generic.

## Scenarios

A scenario provides a stable institutional execution context:

```ts id="r0h5xw"
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

Scenarios can represent different operational situations without requiring Zensorum's core API to understand the underlying industry.

## Domain neutrality

The public SDK does not define healthcare, aviation, financial services, manufacturing, or other industry-specific models.

The same execution contract can support different applications:

```text
Healthcare application
        ↓
Zensorum SDK
        ↓
Governed institutional execution
```

```text
Aviation application
        ↓
Zensorum SDK
        ↓
Governed institutional execution
```

```text
Financial application
        ↓
Zensorum SDK
        ↓
Governed institutional execution
```

The application supplies domain-specific context, inputs, policies, capabilities, and integrations.

The SDK supplies the common execution contract.

## Application versus Zensorum responsibilities

A clean boundary is essential.

| Application owns            | Zensorum owns              |
| --------------------------- | -------------------------- |
| User experience             | Execution contract         |
| Domain knowledge            | Governance boundary        |
| AI integration              | Authority boundary         |
| External-system integration | Decision result            |
| Application capabilities    | Execution outcome          |
| Actual application actions  | Evidence projection        |
| Domain-specific workflows   | Execution history contract |

This separation allows Zensorum to remain reusable across industries and use cases.

## Public contract versus implementation

The public SDK is an application-facing contract.

It does not expose the implementation details of Zensorum's trusted execution infrastructure.

An application should depend on:

```text
Application
    ↓
@zensorum/sdk
    ↓
Zensorum execution service
```

rather than:

```text
Application
    ↓
Private runtime
    ↓
Internal persistence
    ↓
Internal execution infrastructure
```

This boundary allows the implementation to evolve without requiring applications to depend on internal runtime details.

## Local reference implementation

The SDK currently includes a local reference implementation for development and demonstration.

It is intentionally minimal and in-memory.

It demonstrates the public execution contract but should not be interpreted as the complete production Zensorum execution infrastructure.

Production deployments can provide the same public contract through a service-backed implementation.

## Design principle

The public SDK follows one central design principle:

> Applications own domain action. Zensorum governs institutional execution of that action.

This keeps the SDK industry-neutral while allowing increasingly sophisticated institutional governance, context, continuity, evidence, and execution capabilities behind the public boundary.
