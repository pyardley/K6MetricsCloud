/**
 * config.js - Shared configuration for QuickPizza k6 load tests
 *
 * This module centralises all test configuration including:
 *   - Base URL and endpoints
 *   - Thresholds for pass/fail criteria
 *   - Scenario definitions (smoke, average, stress, spike)
 *
 * Usage:
 *   import { BASE_URL, ENDPOINTS, THRESHOLDS, SCENARIOS } from './config.js';
 */

// ---------------------------------------------------------------------------
// Target application
// ---------------------------------------------------------------------------
export const BASE_URL = "https://quickpizza.grafana.com";

export const ENDPOINTS = {
  homepage: "/",
  apiPizza: "/api/pizza", // POST – generates a random pizza recommendation
  apiRatings: "/api/ratings", // POST – submit a rating (optional flow)
  apiUsers: "/api/users", // POST – create a new user (no auth required)
  apiLogin: "/api/users/token/login", // POST – login and get auth token
};

// ---------------------------------------------------------------------------
// Shared thresholds – applied regardless of the chosen scenario
// ---------------------------------------------------------------------------
export const THRESHOLDS = {
  // Built-in k6 metrics
  http_req_duration: [
    "p(95)<800", // 95th percentile response time < 800 ms
    "p(99)<1500", // 99th percentile response time < 1500 ms
  ],
  http_req_failed: [
    "rate<0.01", // Less than 1 % of requests should fail
  ],
  // Custom metrics (defined in helpers.js)
  pizza_generation_duration: [
    "p(95)<1000", // Pizza API 95th percentile < 1 s
  ],
  pizza_generation_errors: [
    "rate<0.02", // Less than 2 % pizza generation errors
  ],
};

// ---------------------------------------------------------------------------
// Scenario profiles
//
// Select at runtime via:  k6 run --env TEST_TYPE=average pizza-load-test.js
// ---------------------------------------------------------------------------

/** Smoke – quick sanity check with minimal load */
const SMOKE = {
  smoke: {
    executor: "ramping-vus",
    startVUs: 1,
    stages: [
      { duration: "10s", target: 3 },
      { duration: "30s", target: 3 },
      { duration: "10s", target: 0 },
    ],
    gracefulRampDown: "5s",
  },
};

/** Average – sustained moderate load */
const AVERAGE = {
  average_load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 20 }, // ramp up
      { duration: "1m", target: 50 }, // plateau
      { duration: "30s", target: 50 }, // hold
      { duration: "30s", target: 0 }, // ramp down
    ],
    gracefulRampDown: "10s",
  },
};

/** Stress – push beyond normal capacity */
const STRESS = {
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 30 },
      { duration: "1m", target: 80 },
      { duration: "30s", target: 100 },
      { duration: "1m", target: 100 },
      { duration: "30s", target: 0 },
    ],
    gracefulRampDown: "15s",
  },
};

/** Spike – sudden burst of traffic */
const SPIKE = {
  spike: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "10s", target: 5 },
      { duration: "5s", target: 120 }, // instant spike
      { duration: "30s", target: 120 }, // hold spike
      { duration: "10s", target: 5 }, // drop back
      { duration: "20s", target: 0 },
    ],
    gracefulRampDown: "10s",
  },
};

// Map of available scenarios keyed by TEST_TYPE env var
const SCENARIO_MAP = {
  smoke: SMOKE,
  average: AVERAGE,
  stress: STRESS,
  spike: SPIKE,
};

/**
 * Return the scenario object for the given test type.
 * Defaults to "smoke" if the env var is missing or unrecognised.
 *
 * @param {string} testType - value of __ENV.TEST_TYPE
 * @returns {object} k6 scenarios object
 */
export function getScenarios(testType) {
  const key = (testType || "smoke").toLowerCase();
  const scenario = SCENARIO_MAP[key];
  if (!scenario) {
    console.warn(
      `⚠️  Unknown TEST_TYPE "${testType}". Falling back to "smoke". ` +
        `Valid options: ${Object.keys(SCENARIO_MAP).join(", ")}`,
    );
    return SMOKE;
  }
  console.log(`📋 Selected test profile: ${key}`);
  return scenario;
}
