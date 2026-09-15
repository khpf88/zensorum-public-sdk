const assert = require("node:assert/strict");
const test = require("node:test");

const { createZensorum } = require("../dist/index.js");

function createRequest(context) {
  const zensorum = createZensorum();

  const institution = zensorum.institution({
    id: "green-valley-farms",
    name: "Green Valley Farms",
  });

  const scenario = zensorum.scenario({
    id: "irrigation-intervention",
    name: "Irrigation Intervention",
    version: "1",
    stages: [],
  });

  const governance = zensorum.governance({
    policies: [
      {
        id: "irrigation-boundary",
        name: "Irrigation Boundary",
        version: "1",
        specification: {
          all: [
            {
              path: "soilMoisture",
              operator: "lt",
              value: 30,
            },
            {
              path: "rainfallProbability",
              operator: "lt",
              value: 40,
            },
            {
              path: "reservoirLevel",
              operator: "gt",
              value: 20,
            },
          ],
        },
      },
    ],
  });

  const authority = zensorum.authority({
    id: "farm-operations-manager",
    name: "Farm Operations Manager",
  });

  return {
    institution,
    scenario,
    context,
    aiInput: {
      source: "reference-ai",
      recommendation: {
        action: "irrigate",
        fieldId: "field-a",
        durationMinutes: 45,
      },
    },
    governance,
    authority,
    capabilities: [
      {
        name: "irrigate",
        execute: async (recommendation) => ({
          executed: true,
          recommendation,
        }),
      },
    ],
  };
}

test("approves execution when all contextual governance conditions are satisfied", async () => {
  const zensorum = createZensorum();
  const result = await zensorum.client().execute(
    createRequest({
      soilMoisture: 24,
      rainfallProbability: 10,
      reservoirLevel: 62,
    })
  );

  assert.equal(result.decision.status, "approved");
  assert.equal(result.action.status, "executed");
  assert.equal(result.outcome.status, "completed");
});

test("blocks execution when a contextual governance condition fails", async () => {
  const zensorum = createZensorum();
  const result = await zensorum.client().execute(
    createRequest({
      soilMoisture: 24,
      rainfallProbability: 10,
      reservoirLevel: 12,
    })
  );

  assert.equal(result.decision.status, "blocked");
  assert.equal(result.action.status, "not-executed");
  assert.equal(result.outcome.status, "not-executed");
  assert.match(
    result.decision.reason,
    /irrigation-boundary/
  );
});

test("blocks execution when a required contextual value is missing", async () => {
  const zensorum = createZensorum();
  const result = await zensorum.client().execute(
    createRequest({
      soilMoisture: 24,
      rainfallProbability: 10,
    })
  );

  assert.equal(result.decision.status, "blocked");
  assert.equal(result.action.status, "not-executed");
  assert.equal(result.outcome.status, "not-executed");
});

test("supports nested generic context paths", async () => {
  const zensorum = createZensorum();

  const request = createRequest({
    field: {
      soilMoisture: 24,
    },
    weather: {
      rainfallProbability: 10,
    },
    resources: {
      reservoirLevel: 62,
    },
  });

  request.governance.policies[0].specification = {
    all: [
      {
        path: "field.soilMoisture",
        operator: "lt",
        value: 30,
      },
      {
        path: "weather.rainfallProbability",
        operator: "lt",
        value: 40,
      },
      {
        path: "resources.reservoirLevel",
        operator: "gt",
        value: 20,
      },
    ],
  };

  const result = await zensorum.client().execute(request);

  assert.equal(result.decision.status, "approved");
  assert.equal(result.action.status, "executed");
});
