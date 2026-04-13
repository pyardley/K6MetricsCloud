/**
 * helpers.js - Utility functions and custom metrics for QuickPizza k6 tests
 *
 * Provides:
 *   - Custom k6 metrics (Trend, Rate, Counter)
 *   - Reusable request helpers with built-in checks
 *   - Realistic think-time utility
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { BASE_URL, ENDPOINTS } from "./config.js";

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

/** Duration (ms) specifically for the pizza generation API call */
export const pizzaGenerationDuration = new Trend(
  "pizza_generation_duration",
  true,
);

/** Error rate for pizza generation requests */
export const pizzaGenerationErrors = new Rate("pizza_generation_errors");

/** Total count of pizzas successfully generated */
export const pizzasGenerated = new Counter("pizzas_generated");

// ---------------------------------------------------------------------------
// Shared HTTP parameters
// ---------------------------------------------------------------------------

const JSON_HEADERS = {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "k6-quickpizza-loadtest/1.0",
  },
};

const HTML_HEADERS = {
  headers: {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": "k6-quickpizza-loadtest/1.0",
  },
};

/**
 * Build JSON headers with an auth token included.
 * @param {string} token - The QuickPizza user token
 * @returns {object} HTTP params with Authorization header
 */
function authHeaders(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "k6-quickpizza-loadtest/1.0",
      Authorization: `token ${token}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Authentication helpers
// ---------------------------------------------------------------------------

/**
 * Create a new QuickPizza user and return the auth token.
 * This calls POST /api/users to register, then POST /api/users/token/login
 * to obtain a session token.
 *
 * @param {string} [username] - Username (auto-generated if not provided)
 * @param {string} [password] - Password (auto-generated if not provided)
 * @returns {string} The auth token for use in subsequent API calls
 */
export function createUserAndLogin(username, password) {
  // Generate unique credentials per test run
  const user =
    username || `k6user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const pass = password || `k6pass_${Date.now()}`;

  // Step 1: Create the user
  const createRes = http.post(
    `${BASE_URL}${ENDPOINTS.apiUsers}`,
    JSON.stringify({ username: user, password: pass }),
    JSON_HEADERS,
  );

  const userCreated = check(createRes, {
    "user creation: status is 200 or 201": (r) =>
      r.status === 200 || r.status === 201,
  });

  if (!userCreated) {
    console.error(
      `Failed to create user: ${createRes.status} ${createRes.body}`,
    );
    return null;
  }

  // Step 2: Login to get a token
  const loginRes = http.post(
    `${BASE_URL}${ENDPOINTS.apiLogin}`,
    JSON.stringify({ username: user, password: pass }),
    JSON_HEADERS,
  );

  const loginSuccess = check(loginRes, {
    "login: status is 200": (r) => r.status === 200,
    "login: response has token": (r) => {
      try {
        return JSON.parse(r.body).token && JSON.parse(r.body).token.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    console.error(`Failed to login: ${loginRes.status} ${loginRes.body}`);
    return null;
  }

  const token = JSON.parse(loginRes.body).token;
  console.log(
    `✅ Authenticated as "${user}" (token: ${token.substring(0, 4)}...)`,
  );
  return token;
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

/**
 * Visit the QuickPizza homepage and verify it loads correctly.
 *
 * @returns {import('k6/http').RefinedResponse} The HTTP response
 */
export function visitHomepage() {
  const res = http.get(`${BASE_URL}${ENDPOINTS.homepage}`, HTML_HEADERS);

  check(res, {
    "homepage: status is 200": (r) => r.status === 200,
    "homepage: body contains QuickPizza": (r) =>
      r.body && r.body.includes("QuickPizza"),
  });

  return res;
}

/**
 * Generate a random pizza by calling the QuickPizza API.
 * This simulates clicking "Pizza, Please!" on the UI.
 *
 * The API expects a POST to /api/pizza with a JSON body specifying
 * the maximum number of ingredients and any dietary restrictions.
 *
 * @param {object} [options]
 * @param {string} [options.token] - Auth token from createUserAndLogin()
 * @param {number} [options.maxCaloriesPerSlice=1000] - Max calories per slice
 * @param {boolean} [options.mustBeVegetarian=false] - Vegetarian only
 * @param {number} [options.maxNumberOfToppings=6] - Max toppings
 * @param {number} [options.minNumberOfToppings=2] - Min toppings
 * @returns {import('k6/http').RefinedResponse} The HTTP response
 */
export function generatePizza(options = {}) {
  const payload = JSON.stringify({
    maxCaloriesPerSlice: options.maxCaloriesPerSlice || 1000,
    mustBeVegetarian: options.mustBeVegetarian || false,
    excludedIngredients: options.excludedIngredients || [],
    excludedTools: options.excludedTools || [],
    maxNumberOfToppings: options.maxNumberOfToppings || 6,
    minNumberOfToppings: options.minNumberOfToppings || 2,
  });

  const headers = options.token ? authHeaders(options.token) : JSON_HEADERS;

  const res = http.post(`${BASE_URL}${ENDPOINTS.apiPizza}`, payload, headers);

  // Record custom metrics
  pizzaGenerationDuration.add(res.timings.duration);

  const success = check(res, {
    "pizza API: status is 200": (r) => r.status === 200,
    "pizza API: response has pizza name": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.pizza && body.pizza.name && body.pizza.name.length > 0;
      } catch {
        return false;
      }
    },
    "pizza API: response has ingredients": (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.pizza &&
          Array.isArray(body.pizza.ingredients) &&
          body.pizza.ingredients.length > 0
        );
      } catch {
        return false;
      }
    },
  });

  if (success) {
    pizzasGenerated.add(1);
    pizzaGenerationErrors.add(0); // record success
  } else {
    pizzaGenerationErrors.add(1); // record failure
  }

  return res;
}

/**
 * Submit a star rating for the recommended pizza.
 * This simulates the optional "rate this pizza" interaction.
 *
 * @param {number} stars - Rating from 1-5
 * @param {number} pizzaId - The ID of the pizza to rate
 * @param {string} [token] - Auth token from createUserAndLogin()
 * @returns {import('k6/http').RefinedResponse}
 */
export function ratePizza(stars = 5, pizzaId = 0, token = null) {
  const payload = JSON.stringify({ stars, pizza_id: pizzaId });
  const headers = token ? authHeaders(token) : JSON_HEADERS;

  const res = http.post(`${BASE_URL}${ENDPOINTS.apiRatings}`, payload, headers);

  check(res, {
    "rating API: status is 200 or 201": (r) =>
      r.status === 200 || r.status === 201,
  });

  return res;
}

// ---------------------------------------------------------------------------
// Think-time helpers
// ---------------------------------------------------------------------------

/**
 * Simulate realistic user think time.
 * Adds a random sleep between min and max seconds.
 *
 * @param {number} [min=1] - Minimum seconds
 * @param {number} [max=3] - Maximum seconds
 */
export function thinkTime(min = 1, max = 3) {
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}

/**
 * Short pause to simulate page rendering / UI interaction delay.
 */
export function shortPause() {
  sleep(0.5 + Math.random() * 1);
}
