@echo off
REM =========================================================================
REM set-env.example.cmd - EXAMPLE environment variables for k6 + Grafana Cloud
REM
REM 📋 How to use:
REM   1. Copy this file:  copy set-env.example.cmd set-env.cmd
REM   2. Edit set-env.cmd and replace all placeholder values with your real credentials
REM   3. Run:  set-env.cmd
REM   4. Then:  run-tests.cmd average prometheus
REM
REM 🔒 NEVER commit set-env.cmd to version control — it contains secrets.
REM    Only this .example file should be in your repository.
REM =========================================================================

echo Setting k6 Grafana Cloud environment variables...

REM ---------------------------------------------------------------------------
REM Grafana Cloud Prometheus Remote Write
REM
REM Where to find these values:
REM   1. Go to https://grafana.com and sign in
REM   2. Click "My Account" in the top-right
REM   3. In the Grafana Cloud portal, find your Prometheus / Mimir stack
REM   4. Click "Details" to reveal:
REM      - Remote Write Endpoint → use as K6_PROMETHEUS_RW_SERVER_URL
REM      - Username (numeric)    → use as K6_PROMETHEUS_RW_USERNAME
REM   5. For the password, create an API token:
REM      - Go to Security → API Keys → Add API Key
REM      - Role: MetricsPublisher
REM      - Copy the generated token → use as K6_PROMETHEUS_RW_PASSWORD
REM ---------------------------------------------------------------------------
set K6_PROMETHEUS_RW_SERVER_URL=https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
set K6_PROMETHEUS_RW_USERNAME=YOUR_NUMERIC_USERNAME
set K6_PROMETHEUS_RW_PASSWORD=YOUR_GRAFANA_CLOUD_API_TOKEN

REM ---------------------------------------------------------------------------
REM Prometheus output settings (recommended — leave these as-is)
REM ---------------------------------------------------------------------------
set K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true
set K6_PROMETHEUS_RW_STALE_MARKERS=true

REM ---------------------------------------------------------------------------
REM k6 Cloud (optional — only needed if using --out cloud instead of Prometheus)
REM
REM Where to find this:
REM   1. Go to https://app.k6.io
REM   2. Click your avatar → Account Settings → API Token
REM   3. Copy the token
REM ---------------------------------------------------------------------------
REM set K6_CLOUD_TOKEN=YOUR_K6_CLOUD_API_TOKEN

echo.
echo Environment variables set:
echo   K6_PROMETHEUS_RW_SERVER_URL = %K6_PROMETHEUS_RW_SERVER_URL%
echo   K6_PROMETHEUS_RW_USERNAME   = %K6_PROMETHEUS_RW_USERNAME%
echo   K6_PROMETHEUS_RW_PASSWORD   = (hidden)
echo.
echo Ready! Now run:  run-tests.cmd average prometheus
