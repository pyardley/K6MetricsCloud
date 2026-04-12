#!/usr/bin/env bash
# =========================================================================
# run-tests.sh - Run QuickPizza k6 load tests on Linux / macOS
#
# Usage:
#   ./run-tests.sh                       (runs smoke test locally)
#   ./run-tests.sh average               (runs average load test locally)
#   ./run-tests.sh stress                (runs stress test locally)
#   ./run-tests.sh spike                 (runs spike test locally)
#   ./run-tests.sh average prometheus    (sends metrics to Grafana Cloud)
#   ./run-tests.sh average cloud         (sends to k6 Cloud)
# =========================================================================
set -euo pipefail

TEST_TYPE="${1:-smoke}"
OUTPUT_MODE="${2:-}"

echo ""
echo "============================================="
echo "  QuickPizza k6 Load Test Runner"
echo "  Test type  : ${TEST_TYPE}"
echo "  Output     : ${OUTPUT_MODE:-local}"
echo "============================================="
echo ""

K6_CMD="k6 run --env TEST_TYPE=${TEST_TYPE}"

if [[ "${OUTPUT_MODE}" == "prometheus" ]]; then
  echo "Sending metrics to Grafana Cloud Prometheus..."
  echo ""
  echo "Required environment variables:"
  echo "  K6_PROMETHEUS_RW_SERVER_URL"
  echo "  K6_PROMETHEUS_RW_USERNAME"
  echo "  K6_PROMETHEUS_RW_PASSWORD"
  echo ""

  if [[ -z "${K6_PROMETHEUS_RW_SERVER_URL:-}" ]]; then
    echo "ERROR: K6_PROMETHEUS_RW_SERVER_URL is not set."
    echo "See README.md for setup instructions."
    exit 1
  fi

  export K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true
  export K6_PROMETHEUS_RW_STALE_MARKERS=true
  K6_CMD="${K6_CMD} --out experimental-prometheus-rw"
fi

if [[ "${OUTPUT_MODE}" == "cloud" ]]; then
  echo "Sending results to k6 Cloud..."
  echo "Make sure K6_CLOUD_TOKEN is set or you are logged in via 'k6 login cloud'."
  echo ""
  K6_CMD="${K6_CMD} --out cloud"
fi

echo "Running: ${K6_CMD} pizza-load-test.js"
echo ""
${K6_CMD} pizza-load-test.js

echo ""
echo "Test finished."
