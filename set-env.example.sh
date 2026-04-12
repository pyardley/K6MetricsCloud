#!/usr/bin/env bash
# =========================================================================
# set-env.example.sh - EXAMPLE environment variables for k6 + Grafana Cloud
#
# 📋 How to use:
#   1. Copy this file:  cp set-env.example.sh set-env.sh
#   2. Edit set-env.sh and replace all placeholder values with your real credentials
#   3. Source it:  source set-env.sh   (or:  . ./set-env.sh)
#   4. Then run:   ./run-tests.sh average prometheus
#
# 🔒 NEVER commit set-env.sh to version control — it contains secrets.
#    Only this .example file should be in your repository.
# =========================================================================

echo "Setting k6 Grafana Cloud environment variables..."

# ---------------------------------------------------------------------------
# Grafana Cloud Prometheus Remote Write
#
# Where to find these values:
#   1. Go to https://grafana.com and sign in
#   2. Click "My Account" in the top-right
#   3. In the Grafana Cloud portal, find your Prometheus / Mimir stack
#   4. Click "Details" to reveal:
#      - Remote Write Endpoint → use as K6_PROMETHEUS_RW_SERVER_URL
#      - Username (numeric)    → use as K6_PROMETHEUS_RW_USERNAME
#   5. For the password, create an API token:
#      - Go to Security → API Keys → Add API Key
#      - Role: MetricsPublisher
#      - Copy the generated token → use as K6_PROMETHEUS_RW_PASSWORD
# ---------------------------------------------------------------------------
export K6_PROMETHEUS_RW_SERVER_URL="https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push"
export K6_PROMETHEUS_RW_USERNAME="YOUR_NUMERIC_USERNAME"
export K6_PROMETHEUS_RW_PASSWORD="YOUR_GRAFANA_CLOUD_API_TOKEN"

# ---------------------------------------------------------------------------
# Prometheus output settings (recommended — leave these as-is)
# ---------------------------------------------------------------------------
export K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true
export K6_PROMETHEUS_RW_STALE_MARKERS=true

# ---------------------------------------------------------------------------
# k6 Cloud (optional — only needed if using --out cloud instead of Prometheus)
#
# Where to find this:
#   1. Go to https://app.k6.io
#   2. Click your avatar → Account Settings → API Token
#   3. Copy the token
# ---------------------------------------------------------------------------
# export K6_CLOUD_TOKEN="YOUR_K6_CLOUD_API_TOKEN"

echo ""
echo "Environment variables set:"
echo "  K6_PROMETHEUS_RW_SERVER_URL = ${K6_PROMETHEUS_RW_SERVER_URL}"
echo "  K6_PROMETHEUS_RW_USERNAME   = ${K6_PROMETHEUS_RW_USERNAME}"
echo "  K6_PROMETHEUS_RW_PASSWORD   = (hidden)"
echo ""
echo "Ready! Now run:  ./run-tests.sh average prometheus"
