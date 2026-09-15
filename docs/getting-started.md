# Getting Started

This guide shows how to use the Zensorum public SDK to construct an institutional execution flow.

The examples use the local reference implementation included with the SDK. The public contract is designed so that the same application-facing model can later be backed by a service implementation.

## Prerequisites

* Node.js
* pnpm
* TypeScript familiarity

## Install

Once the package is publicly released:

```bash
pnpm add @zensorum/sdk
```

For repository development, clone the repository and install its workspace dependencies:

```bash
pnpm install
```

## Create a Zensorum instance

```ts
import { createZensorum } from "@zensorum/sdk";

const zensorum = createZensorum();
```

The `createZensorum()` factory provides the public SDK surface.

## Define an institution

```ts
const institution = zensorum.institution({
  id: "acme-operations",
  name: "Acme Operations",
});
```

An institution establishes the institutional boundary for execution.

## Define a scenario

```ts
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

A scenario describes the institutional situation or workflow being executed.

## Provide governance

```ts
const governance = zensorum.governance({
  policies: [
    {
      id: "response-policy",
      name: "Response Policy",
      version: "1.0.0",
      specification: {
        executionPermitted: true,
        requiredCondition: "degraded",
        internalCapacityRequired: true,
      },
    },
  ],
});
```

Governance constrains whether a proposed application action may proceed.

The public SDK defines the `Policy` and `Governance` contracts but does not prescribe a universal policy language. Policy semantics can be implemented by the execution service behind the public contract.

The fields shown above are understood by the current local reference implementation for demonstration purposes.

## Define authority

```ts
const authority = zensorum.authority({
  id: "operations-manager",
  name: "Operations Manager",
});
```

Authority identifies the institutional authority associated with the execution request.

## Provide an AI recommendation

```ts
const aiInput = {
  source: "operations-ai",
  recommendation: "Activate response resource",
};
```

The AI recommendation is an input to governed execution. It does not itself authorize execution.

## Define an application capability

The application owns the actual action:

```ts
const capability = {
  name: "activate-response-resource",
  execute: async (recommendation: string) => {
    console.log("Application action:", recommendation);

    return {
      activated: true,
    };
  },
};
```

Zensorum does not own the application's external-system integration or domain-specific action.

## Execute

Create a client and submit the execution request:

```ts
const client = zensorum.client();

const result = await client.execute({
  institution,
  scenario,
  context: {
    operationalCondition: "degraded",
    internalResponseCapacity: "available",
  },
  aiInput,
  governance,
  authority,
  capabilities: [capability],
});
```

The result contains the execution decision, action status, outcome, evidence projection, and execution identifier.

```ts
console.log(result.executionId);
console.log(result.decision);
console.log(result.action);
console.log(result.outcome);
console.log(result.evidence);
```

## Reevaluation

Institutional conditions can change after an execution.

A new context and AI recommendation can be evaluated against the previous execution:

```ts
const reevaluated = await client.reevaluate({
  execution: result,
  context: {
    operationalCondition: "critical",
    internalResponseCapacity: "exhausted",
  },
  aiInput: {
    source: "operations-ai",
    recommendation: "Activate response resource",
  },
  governance,
  authority,
  capabilities: [capability],
});
```

The new execution retains a link to the previous execution through `previousExecutionId`.

```ts
console.log(reevaluated.previousExecutionId);
```

This provides a basic continuity relationship between successive execution states.

## Inspect institutional history

History can be retrieved for an institution and scenario:

```ts
const history = await client.history({
  institution,
  scenario,
});

console.log(history.executions);
```

This allows an application to inspect the sequence of execution results associated with the institutional scenario.

## Complete example

The essential flow is:

```ts
import { createZensorum } from "@zensorum/sdk";

const zensorum = createZensorum();

const institution = zensorum.institution({
  id: "acme-operations",
  name: "Acme Operations",
});

const scenario = zensorum.scenario({
  id: "service-response",
  name: "Service Response",
  version: "1.0.0",
  stages: [
    { id: "assess", mandatory: true },
    { id: "respond", mandatory: true },
  ],
});

const governance = zensorum.governance({
  policies: [
    {
      id: "response-policy",
      name: "Response Policy",
      version: "1.0.0",
      specification: {
        executionPermitted: true,
        requiredCondition: "degraded",
        internalCapacityRequired: true,
      },
    },
  ],
});

const authority = zensorum.authority({
  id: "operations-manager",
  name: "Operations Manager",
});

const capability = {
  name: "activate-response-resource",
  execute: async (recommendation: string) => ({
    activated: true,
    recommendation,
  }),
};

const client = zensorum.client();

const result = await client.execute({
  institution,
  scenario,
  context: {
    operationalCondition: "degraded",
    internalResponseCapacity: "available",
  },
  aiInput: {
    source: "operations-ai",
    recommendation: "Activate response resource",
  },
  governance,
  authority,
  capabilities: [capability],
});

console.log(result);

const history = await client.history({
  institution,
  scenario,
});

console.log(history);
```

## Next steps

* Read [Concepts](./concepts.md) to understand the execution model.
* Read [API Reference](./api.md) for the public TypeScript contracts.
* Run the repository's [Hello World example](../examples/hello-world).

