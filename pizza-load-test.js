/**
 * pizza-load-test.js - Main k6 load test for QuickPizza
 * ======================================================
 *
 * Simulates realistic user flows against https://quickpizza.grafana.com/
 *
 * User Journey:
 *   1. Visit the homepage
 *   2. Think / browse briefly
 *   3. Click "Pizza, Please!" (POST /api/pizza)
 *   4. Review the recommendation
 *   5. Optionally rate the pizza (POST /api/ratings)
 *
 * Run examples:
 *   # Smoke test (default)
 *   k6 run pizza-load-test.js
 *
 *   # Average load test
 *   k6 run --env TEST_TYPE=average pizza-load-test.js
 *
 *   # Stress test
 *   k6 run --env TEST_TYPE=stress pizza-load-test.js
 *
 *   # Spike test
 *   k6 run --env TEST_TYPE=spike pizza-load-test.js
 *
 *   # With Grafana Cloud Prometheus remote write
 *   k6 run --env TEST_TYPE=average \
 *     --out experimental-prometheus-rw \
 *     pizza-load-test.js
 *
 * Environment variables for Prometheus remote write:
 *   K6_PROMETHEUS_RW_SERVER_URL  - Grafana Cloud Mimir endpoint
 *   K6_PROMETHEUS_RW_USERNAME    - Grafana Cloud Prometheus username (numeric)
 *   K6_PROMETHEUS_RW_PASSWORD    - Grafana Cloud API token
 *   K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM - set to "true" for better histograms
 *
 * @see https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
 */

import { group } from "k6";
import { THRESHOLDS, getScenarios } from "./config.js";
import {
  visitHomepage,
  generatePizza,
  ratePizza,
  createUserAndLogin,
  thinkTime,
  shortPause,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------
const testType = __ENV.TEST_TYPE || "smoke";

export const options = {
  scenarios: getScenarios(testType),
  thresholds: THRESHOLDS,

  // Tags applied to every metric – useful for filtering in Grafana
  tags: {
    testType: testType,
    app: "quickpizza",
  },

  // Do not throw on failed checks (we track them via thresholds instead)
  insecureSkipTLSVerify: false,

  // Discard response bodies we don't inspect to save memory under high load
  // (we DO inspect bodies in our checks, so leave this off)
  discardResponseBodies: false,
};

// ---------------------------------------------------------------------------
// Default function – executed once per VU iteration
// ---------------------------------------------------------------------------
export default function (data) {
  const token = data.token;

  // --- Step 1: Visit the homepage -------------------------------------------
  group("01 - Visit Homepage", () => {
    visitHomepage();
    shortPause(); // simulate page render time
  });

  // --- Step 2: Think time (user reads the page) -----------------------------
  thinkTime(1, 3);

  // --- Step 3: Generate a random pizza --------------------------------------
  let pizzaId = 0;
  group("02 - Generate Pizza", () => {
    const res = generatePizza({
      token: token,
      maxCaloriesPerSlice: 1000,
      mustBeVegetarian: Math.random() > 0.7, // 30% chance vegetarian
      maxNumberOfToppings: Math.floor(Math.random() * 5) + 3, // 3-7 toppings
      minNumberOfToppings: 2,
    });
    // Extract pizza ID for rating
    try {
      const body = JSON.parse(res.body);
      if (body.pizza && body.pizza.id) {
        pizzaId = body.pizza.id;
      }
    } catch {
      // Ignore parse errors
    }
    shortPause();
  });

  // --- Step 4: Think time (user reviews the pizza) --------------------------
  thinkTime(2, 5);

  // --- Step 5: Optionally rate the pizza (60% of users do) ------------------
  if (Math.random() < 0.6 && pizzaId > 0) {
    group("03 - Rate Pizza", () => {
      const stars = Math.floor(Math.random() * 5) + 1; // 1-5 stars
      ratePizza(stars, pizzaId, token);
      shortPause();
    });
  }

  // --- Step 6: Short pause before next iteration ----------------------------
  thinkTime(1, 2);
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

/**
 * setup() runs once before the test starts.
 * Use it for one-time initialisation (e.g. auth tokens).
 */
export function setup() {
  console.log("=========================================");
  console.log("  QuickPizza Load Test");
  console.log(`  Test type : ${testType}`);
  console.log(`  Target    : https://quickpizza.grafana.com`);
  console.log("=========================================");

  // Verify the target is reachable before spending VU time
  const res = visitHomepage();
  if (res.status !== 200) {
    throw new Error(
      `Setup failed: homepage returned status ${res.status}. ` +
        "Is https://quickpizza.grafana.com reachable?",
    );
  }
  console.log("✅ Target is reachable.");

  // Create a test user and get an auth token
  // QuickPizza requires authentication for API endpoints
  const token = createUserAndLogin();
  if (!token) {
    throw new Error(
      "Setup failed: could not create user and obtain auth token.",
    );
  }

  // Return data to be passed to default() and teardown()
  return { token };
}

/**
 * teardown() runs once after all VUs have finished.
 */
export function teardown() {
  console.log("=========================================");
  console.log("  Test complete. Check results above or");
  console.log("  in your Grafana Cloud dashboard.");
  console.log("=========================================");
}
