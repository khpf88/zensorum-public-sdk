# Zensorum Public SDK

Build institutional applications with governed execution around AI-assisted decisioning.

Zensorum provides a developer-facing execution layer for applying institutional context, governance, authority, and AI recommendations to application actions.

## What you can build

Applications can use the SDK to:

* define an institution and its operating context
* define scenarios and scenario stages
* provide institutional inputs
* provide AI recommendations
* apply institutional governance and authority
* execute authorized application capabilities
* reevaluate execution when conditions change
* inspect institutional execution history

The SDK is designed to let applications use these capabilities without depending on Zensorum's internal execution engine.

## Install

Once the package is publicly released:

```bash
pnpm add @zensorum/sdk
```

## Quick start

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
  capabilities: [
    {
      name: "activate-response-resource",
      execute: async (recommendation) => {
        console.log("Application action:", recommendation);
        return {
          activated: true,
        };
      },
    },
  ],
});

console.log(result.decision);
console.log(result.outcome);
console.log(result.evidence);
```

The application owns the capability and its actual action. Zensorum provides the governed execution boundary around that action.

## Core concepts

### Institution

The institutional identity and boundary within which execution occurs.

### Context

The operational state used to evaluate an execution request.

### Institutional inputs

Information entering the institutional execution process from application or external sources.

### AI input

An AI-generated recommendation or proposed action. An AI recommendation is an input to governed execution; it is not execution authority.

### Scenario

A defined institutional workflow or operational situation, including its stages and version.

### Governance

The institutional policies that constrain whether an action may proceed.

### Authority

The institutional actor or authority associated with the execution.

### Capability

An application-owned action that Zensorum may authorize for execution.

### Evidence

The execution result includes an evidence projection indicating whether execution evidence is available.

### History and continuity

Executions can be linked through reevaluation, allowing an application to observe how institutional execution changes as conditions change.

## Application boundary

Zensorum does not own the application's domain logic or external systems.

The application owns:

* user experience
* domain knowledge
* AI integration
* external-system integrations
* application capabilities
* actual application actions

Zensorum owns the governed execution contract around those actions.

This separation allows the same execution model to be used across industries, domains, and use cases.

## Example

The repository includes a minimal Hello World example demonstrating:

1. governed execution
2. governance blocking
3. context-sensitive reevaluation
4. execution history

See [examples/hello-world](./examples/hello-world).

## Documentation

* [Getting Started](./docs/getting-started.md)
* [Concepts](./docs/concepts.md)
* [API Reference](./docs/api.md)

## Reference implementation

The current SDK includes a minimal local reference implementation intended for development and demonstration.

The public SDK contract is intentionally separated from Zensorum's private trusted execution infrastructure. The same public contract can be implemented by an independent service-backed client.

## Project status

This repository is the public developer surface for Zensorum.

The SDK is currently in pre-release development. APIs may evolve before the first public release.

## License

Apache License 2.0. See [LICENSE](./LICENSE).
