import { createZensorum } from "@zensorum/sdk";

async function main(): Promise<void> {
  const zensorum = createZensorum();

  const institution = zensorum.institution({
    id: "acme-operations",
    name: "Acme Operations",
  });

  const scenario = zensorum.scenario({
    id: "institutional-operational-response",
    name: "Institutional Operational Response",
    version: "1.0",
    stages: [
      {
        id: "assess",
        mandatory: true,
      },
      {
        id: "decide",
        mandatory: true,
      },
      {
        id: "execute",
        mandatory: true,
      },
    ],
  });

  const authority = zensorum.authority({
    id: "operations-authority",
    name: "Operations Authority",
  });

  const capability = {
    name: "activate-response-resource",
    execute: async (recommendation: unknown) => {
      const resource =
        typeof recommendation === "object" &&
        recommendation !== null &&
        "resource" in recommendation
          ? (recommendation as { resource?: unknown }).resource
          : "unknown";

      console.log(`APPLICATION ACTION: ${String(resource)} response activated`);

      return {
        resource,
        activated: true,
      };
    },
  };

  const client = zensorum.client();

  const recommendation = {
    action: "activate-response-resource",
    resource: "internal",
    reason: "AI predicts continued service degradation.",
  };

  const initialContext = {
    serviceCondition: "degraded",
    internalResponseCapacity: "available",
    externalResponseCapacity: "unavailable",
    operationalPriority: "high",
    activeIncident: true,
  };

  const initialGovernance = zensorum.governance({
    policies: [
      {
        id: "internal-response-policy",
        name: "Internal Response Policy",
        version: "1.0",
        specification: {
          executionPermitted: true,
          internalCapacityRequired: true,
        },
      },
    ],
  });

  console.log("\n=== ZENSORUM INSTITUTIONAL OPERATIONAL RESPONSE ===");

  console.log("\n[1] INITIAL CONDITION");
  console.log("AI: Activate response resource");
  console.log("Context: degraded / internal capacity available");

  const firstResult = await client.execute({
    institution,
    scenario,
    context: initialContext,
    aiInput: {
      source: "acme-ai",
      recommendation,
    },
    governance: initialGovernance,
    authority,
    capabilities: [capability],
  });

  console.log(`Decision: ${firstResult.decision.status.toUpperCase()}`);
  console.log(`Outcome: ${firstResult.outcome.status.toUpperCase()}`);

  const changedContext = {
    serviceCondition: "critical",
    internalResponseCapacity: "exhausted",
    externalResponseCapacity: "unavailable",
    operationalPriority: "high",
    activeIncident: true,
  };

  const changedGovernance = zensorum.governance({
    policies: [
      {
        id: "internal-response-policy",
        name: "Internal Response Policy",
        version: "1.0",
        specification: {
          executionPermitted: true,
          internalCapacityRequired: true,
        },
      },
    ],
  });

  console.log("\n[2] CONDITIONS CHANGED");
  console.log("AI: Activate response resource");
  console.log("Context: critical / internal capacity exhausted");

  const secondResult = await client.reevaluate({
    execution: firstResult,
    context: changedContext,
    aiInput: {
      source: "acme-ai",
      recommendation,
    },
    governance: changedGovernance,
    authority,
    capabilities: [capability],
  });

  console.log(`Decision: ${secondResult.decision.status.toUpperCase()}`);
  console.log(`Outcome: ${secondResult.outcome.status.toUpperCase()}`);

  const finalContext = {
    serviceCondition: "critical",
    internalResponseCapacity: "exhausted",
    externalResponseCapacity: "available",
    operationalPriority: "high",
    activeIncident: true,
  };

  const externalRecommendation = {
    action: "activate-response-resource",
    resource: "external",
    reason: "External response capacity is now available.",
  };

  const externalGovernance = zensorum.governance({
    policies: [
      {
        id: "external-response-policy",
        name: "External Response Policy",
        version: "1.0",
        specification: {
          executionPermitted: true,
          externalCapacityRequired: true,
        },
      },
    ],
  });

  console.log("\n[3] EXTERNAL CAPACITY AVAILABLE");
  console.log("AI: Activate response resource");
  console.log("Context: critical / external capacity available");

  const thirdResult = await client.reevaluate({
    execution: secondResult,
    context: finalContext,
    aiInput: {
      source: "acme-ai",
      recommendation: externalRecommendation,
    },
    governance: externalGovernance,
    authority,
    capabilities: [capability],
  });

  console.log(`Decision: ${thirdResult.decision.status.toUpperCase()}`);
  console.log(`Outcome: ${thirdResult.outcome.status.toUpperCase()}`);

  const history = await client.history({
    institution,
    scenario,
  });

  console.log("\n=== INSTITUTIONAL HISTORY ===");
  console.log(`Executions: ${history.executions.length}`);
  console.log(
    `Completed: ${
      history.executions.filter(
        (execution) => execution.outcome.status === "completed"
      ).length
    }`
  );
  console.log(
    `Blocked: ${
      history.executions.filter(
        (execution) => execution.decision.status === "blocked"
      ).length
    }`
  );

  if (
    firstResult.decision.status !== "approved" ||
    firstResult.action.status !== "executed" ||
    secondResult.decision.status !== "blocked" ||
    secondResult.action.status !== "not-executed" ||
    thirdResult.decision.status !== "approved" ||
    thirdResult.action.status !== "executed" ||
    history.executions.length !== 3
  ) {
    throw new Error("Killer demonstration proof failed.");
  }

  console.log("\nKILLER DEMONSTRATION: PASS");
}

main().catch((error: unknown) => {
  console.error(error);
});
