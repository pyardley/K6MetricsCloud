# 🍕 QuickPizza k6 Load Test Suite

A complete, production-ready performance testing solution for the [QuickPizza](https://quickpizza.grafana.com/) demo application using **k6**, with built-in support for sending metrics to **Grafana Cloud Prometheus (Mimir)**.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Setup](#environment-setup)
5. [Running Tests](#running-tests)
6. [Test Profiles](#test-profiles)
7. [Sending Metrics to Grafana Cloud](#sending-metrics-to-grafana-cloud)
8. [Grafana Dashboard Setup](#grafana-dashboard-setup)
9. [Useful Prometheus Queries](#useful-prometheus-queries)
10. [Correlating with Backend Metrics](#correlating-with-backend-metrics)
11. [Git & GitHub](#git--github)
12. [Tips & Warnings](#tips--warnings)

---

## Project Structure

```
K6MetricsCloud/
├── pizza-load-test.js                     # Main k6 test script
├── config.js                              # Shared configuration (URLs, thresholds, scenarios)
├── helpers.js                             # Reusable request helpers & custom metrics
├── run-tests.cmd                          # Windows runner script
├── run-tests.sh                           # Linux/macOS runner script
├── set-env.cmd                            # 🔒 Your real credentials (Windows) — git-ignored
├── set-env.sh                             # 🔒 Your real credentials (Linux/macOS) — git-ignored
├── set-env.example.cmd                    # 📋 Example env template for Windows (safe to commit)
├── set-env.example.sh                     # 📋 Example env template for Linux/macOS (safe to commit)
├── .gitignore                             # Excludes credential files from version control
├── dashboards/
│   └── k6-quickpizza-dashboard.json       # Importable Grafana dashboard
└── README.md                              # This file
```

---

## Prerequisites

| Tool                                                         | Version         | Purpose                      |
| ------------------------------------------------------------ | --------------- | ---------------------------- |
| [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)  | ≥ 0.50          | Load testing runtime         |
| [Grafana Cloud](https://grafana.com/products/cloud/) account | Free tier works | Metrics storage & dashboards |

---

## Installation

### Windows (winget)

```cmd
winget install Grafana.k6
```

### Windows (Chocolatey)

```cmd
choco install k6
```

### macOS (Homebrew)

```bash
brew install k6
```

### Linux (Debian/Ubuntu)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Docker

```bash
docker run --rm -v $(pwd):/scripts grafana/k6 run /scripts/pizza-load-test.js
```

### Verify installation

```bash
k6 version
```

---

## Environment Setup

Before sending metrics to Grafana Cloud, you need to configure your credentials. This project uses **environment variable scripts** to keep secrets out of version control.

### Step 1: Create your local env file

**Windows:**

```cmd
copy set-env.example.cmd set-env.cmd
```

**Linux / macOS:**

```bash
cp set-env.example.sh set-env.sh
```

### Step 2: Edit with your real credentials

Open the newly created `set-env.cmd` (or `set-env.sh`) and replace the placeholder values:

| Placeholder                    | Where to find it                                                              |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `YOUR_NUMERIC_USERNAME`        | Grafana Cloud → My Account → Prometheus → Details → **Username**              |
| `YOUR_GRAFANA_CLOUD_API_TOKEN` | Grafana Cloud → Security → API Keys → Add Key (role: **MetricsPublisher**)    |
| Remote write URL               | Grafana Cloud → My Account → Prometheus → Details → **Remote Write Endpoint** |
| `YOUR_K6_CLOUD_API_TOKEN`      | (Optional) https://app.k6.io → Account Settings → API Token                   |

### Step 3: Load the variables

**Windows:**

```cmd
set-env.cmd
```

**Linux / macOS:**

```bash
source set-env.sh
```

### 🔒 Security note

- `set-env.cmd` and `set-env.sh` are listed in [`.gitignore`](.gitignore) — they will **never** be committed
- Only the `.example` versions (with placeholders) are tracked in Git
- **Never** paste real tokens into the example files

---

## Running Tests

### Quick start — Smoke test (local output only)

```bash
k6 run pizza-load-test.js
```

### Choose a test profile

Pass the `TEST_TYPE` environment variable to select a profile:

```bash
# Smoke test (default) — quick sanity check
k6 run --env TEST_TYPE=smoke pizza-load-test.js

# Average load test — sustained 50 VUs
k6 run --env TEST_TYPE=average pizza-load-test.js

# Stress test — ramp to 100 VUs
k6 run --env TEST_TYPE=stress pizza-load-test.js

# Spike test — sudden burst to 120 VUs
k6 run --env TEST_TYPE=spike pizza-load-test.js
```

### Using the runner scripts

**Windows:**

```cmd
run-tests.cmd                          REM smoke test
run-tests.cmd average                  REM average load
run-tests.cmd average prometheus       REM average + Grafana Cloud Prometheus
run-tests.cmd smoke cloud              REM smoke + k6 Cloud
```

**Linux / macOS:**

```bash
chmod +x run-tests.sh
./run-tests.sh                         # smoke test
./run-tests.sh average                 # average load
./run-tests.sh average prometheus      # average + Grafana Cloud Prometheus
./run-tests.sh smoke cloud             # smoke + k6 Cloud
```

---

## Test Profiles

| Profile   | VUs   | Duration | Use Case                         |
| --------- | ----- | -------- | -------------------------------- |
| `smoke`   | 1→3   | ~50 s    | Quick sanity check; CI pipelines |
| `average` | 0→50  | ~2.5 min | Typical production-like load     |
| `stress`  | 0→100 | ~3.5 min | Find breaking points             |
| `spike`   | 0→120 | ~1.5 min | Test sudden traffic bursts       |

### Thresholds (applied to all profiles)

| Metric                          | Condition |
| ------------------------------- | --------- |
| `http_req_duration` p95         | < 800 ms  |
| `http_req_duration` p99         | < 1500 ms |
| `http_req_failed`               | < 1 %     |
| `pizza_generation_duration` p95 | < 1000 ms |
| `pizza_generation_errors`       | < 2 %     |

---

## Sending Metrics to Grafana Cloud

### Option A — Grafana Cloud Prometheus Remote Write (Recommended)

This sends k6 metrics directly to **Grafana Cloud Mimir** (Prometheus-compatible) so you can query and visualise them alongside your other infrastructure metrics.

#### Step 1: Get your Grafana Cloud credentials

1. Log in to [grafana.com](https://grafana.com/) → **My Account**
2. In the **Grafana Cloud** portal, find your **Prometheus** stack
3. Click **Details** → note down:
   - **Remote Write Endpoint** (e.g. `https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push`)
   - **Username** (numeric ID, e.g. `123456`)
   - **Password** — generate a Grafana Cloud API token with `MetricsPublisher` role:
     - Go to **Security** → **API Keys** → **Add API Key**
     - Select role: **MetricsPublisher**
     - Copy the token

#### Step 2: Set environment variables

The easiest way is to use the provided **env setup scripts** (see [Environment Setup](#environment-setup)):

**Windows:**

```cmd
copy set-env.example.cmd set-env.cmd
REM Edit set-env.cmd with your real credentials, then run:
set-env.cmd
```

**Linux / macOS:**

```bash
cp set-env.example.sh set-env.sh
# Edit set-env.sh with your real credentials, then source it:
source set-env.sh
```

Alternatively, set the variables manually in your terminal:

<details>
<summary>Manual environment variable commands (click to expand)</summary>

**Windows (cmd):**

```cmd
set K6_PROMETHEUS_RW_SERVER_URL=https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
set K6_PROMETHEUS_RW_USERNAME=123456
set K6_PROMETHEUS_RW_PASSWORD=glc_your_api_token_here
set K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true
set K6_PROMETHEUS_RW_STALE_MARKERS=true
```

**Linux / macOS (bash):**

```bash
export K6_PROMETHEUS_RW_SERVER_URL="https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push"
export K6_PROMETHEUS_RW_USERNAME="123456"
export K6_PROMETHEUS_RW_PASSWORD="glc_your_api_token_here"
export K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true
export K6_PROMETHEUS_RW_STALE_MARKERS=true
```

</details>

#### Step 3: Run the test with Prometheus output

```bash
k6 run --env TEST_TYPE=average --out experimental-prometheus-rw pizza-load-test.js
```

#### Step 4: Verify metrics in Grafana

1. Open your Grafana Cloud instance
2. Go to **Explore** → select your **Prometheus** datasource
3. Query: `k6_http_reqs_total{}` — you should see data appearing

---

### Option B — k6 Cloud Output

If you have a [Grafana Cloud k6](https://grafana.com/products/cloud/k6/) subscription, you can send results to the k6 Cloud platform for its built-in analysis UI.

#### Step 1: Authenticate

```bash
k6 login cloud --token YOUR_K6_CLOUD_TOKEN
```

Or set the environment variable:

```bash
export K6_CLOUD_TOKEN=your_token_here
```

#### Step 2: Run with cloud output

```bash
k6 run --env TEST_TYPE=average --out cloud pizza-load-test.js
```

#### Correlating k6 Cloud with Prometheus

If your application exposes its own Prometheus metrics (e.g. from a `/metrics` endpoint), you can correlate them with k6 test runs by:

1. Adding a `testid` label to your k6 metrics (already included as a tag)
2. Using Grafana to overlay k6 Cloud test results with your app's Prometheus metrics via **mixed datasources** on the same dashboard

---

## Grafana Dashboard Setup

> **⚠️ Important:** You must import the dashboard inside your **Grafana Cloud instance** (the actual Grafana UI), **not** the grafana.com account portal. The "My Dashboards" / "Published Dashboards" page on grafana.com is for publishing dashboards to the community — that's not what you want.

### Option 1: Import the included custom dashboard

1. Open your **Grafana Cloud instance** — click the **"Launch"** button next to your Grafana stack on the grafana.com portal (or go directly to your Grafana URL, e.g. `https://pryardley.grafana.net/`)
2. In the left sidebar, click the **hamburger menu (☰)** → **Dashboards**
3. Click the **New** button (top-right) → select **Import**
4. On the "Import dashboard" page, click **Upload dashboard JSON file**
5. Browse to and select `dashboards/k6-quickpizza-dashboard.json` from this project
6. In the **Prometheus** datasource dropdown, select your Grafana Cloud Prometheus datasource (usually named something like `grafanacloud-pryardley-prom`)
7. Click **Import**
8. The dashboard will open — you'll see data once you run a test with `--out experimental-prometheus-rw`

### Option 2: Use the official community dashboards

The Grafana community provides pre-built k6 dashboards that can also be imported:

| Dashboard                                                                        | ID        | Description                           |
| -------------------------------------------------------------------------------- | --------- | ------------------------------------- |
| [k6 Prometheus](https://grafana.com/grafana/dashboards/19665)                    | **19665** | Official k6 + Prometheus remote write |
| [k6 Prometheus (Native Histogram)](https://grafana.com/grafana/dashboards/18030) | **18030** | For native histogram format           |
| [k6 Load Testing Results](https://grafana.com/grafana/dashboards/2587)           | **2587**  | Classic k6 dashboard                  |

**To import by ID:**

1. Open your **Grafana Cloud instance** (e.g. `https://pryardley.grafana.net/`)
2. Left sidebar **☰** → **Dashboards** → **New** → **Import**
3. In the **"Import via grafana.com"** field, enter the dashboard ID (e.g. `19665`)
4. Click **Load**
5. Select your Prometheus datasource from the dropdown
6. Click **Import**

---

## Useful Prometheus Queries

Use these in Grafana **Explore** or in dashboard panels. All k6 metrics are prefixed with `k6_`.

### Virtual Users

```promql
# Current active VUs
k6_vus{}

# Maximum VUs reached
k6_vus_max{}
```

### Request Rate

```promql
# Overall HTTP request rate (requests/sec)
rate(k6_http_reqs_total{}[1m])

# Request rate by URL name
rate(k6_http_reqs_total{}[1m])
```

### Response Duration Percentiles

```promql
# Median (p50) response time in milliseconds
histogram_quantile(0.50, rate(k6_http_req_duration_seconds{}[1m])) * 1000

# 90th percentile
histogram_quantile(0.90, rate(k6_http_req_duration_seconds{}[1m])) * 1000

# 95th percentile
histogram_quantile(0.95, rate(k6_http_req_duration_seconds{}[1m])) * 1000

# 99th percentile
histogram_quantile(0.99, rate(k6_http_req_duration_seconds{}[1m])) * 1000
```

### Error Rate

```promql
# HTTP failure rate (ratio 0-1)
rate(k6_http_req_failed_total{}[1m])

# As a percentage
rate(k6_http_req_failed_total{}[1m]) * 100
```

### Iterations

```promql
# Iterations completed per second
rate(k6_iterations_total{}[1m])

# Total iterations
k6_iterations_total{}
```

### Data Transfer

```promql
# Bytes received per second
rate(k6_data_received_total{}[1m])

# Bytes sent per second
rate(k6_data_sent_total{}[1m])
```

### Custom Metrics (Pizza-specific)

```promql
# Total pizzas generated
k6_pizzas_generated_total{}

# Pizza generation rate (pizzas/sec)
rate(k6_pizzas_generated_total{}[1m])

# Pizza API p95 duration
histogram_quantile(0.95, rate(k6_pizza_generation_duration_seconds{}[1m])) * 1000

# Pizza generation error rate
k6_pizza_generation_errors{}
```

### Checks

```promql
# Check pass rate
rate(k6_checks_total{check=~".*"}[1m])
```

---

## Correlating with Backend Metrics

If QuickPizza (or your own application) exposes Prometheus metrics, you can correlate them with k6 load test data on the same Grafana dashboard.

### QuickPizza's metrics endpoint

QuickPizza exposes Prometheus metrics at:

```
https://quickpizza.grafana.com/metrics
```

Useful backend metrics to overlay:

```promql
# Application request duration (server-side)
histogram_quantile(0.95, rate(quickpizza_http_request_duration_seconds_bucket[1m])) * 1000

# Active connections on the server
quickpizza_active_connections

# Error count from the server perspective
rate(quickpizza_errors_total[1m])
```

### Creating a correlated dashboard

1. Add **both** datasources to your Grafana instance (k6 Prometheus + app Prometheus)
2. Create a dashboard with **mixed datasource** panels
3. Overlay k6's `http_req_duration` with the server's `request_duration` to compare client-side vs server-side latency
4. Align time ranges — k6 metrics and app metrics will share the same time axis

---

## Git & GitHub

This project is designed to be safely pushed to GitHub (public or private) without leaking credentials.

### What gets committed (safe)

| File                  | Contains secrets? | Purpose                                  |
| --------------------- | :---------------: | ---------------------------------------- |
| `pizza-load-test.js`  |        ❌         | Main test script                         |
| `config.js`           |        ❌         | URLs, thresholds, scenarios              |
| `helpers.js`          |        ❌         | Request helpers, custom metrics          |
| `run-tests.cmd`       |        ❌         | Windows runner                           |
| `run-tests.sh`        |        ❌         | Linux/macOS runner                       |
| `set-env.example.cmd` |        ❌         | Template with placeholders (Windows)     |
| `set-env.example.sh`  |        ❌         | Template with placeholders (Linux/macOS) |
| `.gitignore`          |        ❌         | Protects credential files                |
| `dashboards/*.json`   |        ❌         | Grafana dashboard                        |
| `README.md`           |        ❌         | Documentation                            |

### What is git-ignored (secrets)

| File                  | Why                                          |
| --------------------- | -------------------------------------------- |
| `set-env.cmd`         | Contains your real Grafana Cloud credentials |
| `set-env.sh`          | Contains your real Grafana Cloud credentials |
| `.env` / `.env.local` | Alternative env file formats                 |

### Initial repository setup

```bash
# Initialise the repo
git init
git add .
git commit -m "Initial commit: k6 QuickPizza load test suite"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/K6MetricsCloud.git
git branch -M main
git push -u origin main
```

### Cloning on a new machine

```bash
git clone https://github.com/YOUR_USERNAME/K6MetricsCloud.git
cd K6MetricsCloud

# Create your local credential files from the examples
# Windows:
copy set-env.example.cmd set-env.cmd
# Linux/macOS:
cp set-env.example.sh set-env.sh

# Edit set-env.cmd / set-env.sh with your real credentials
# Then load them and run tests
```

### Verifying secrets are not tracked

```bash
# This should show NO output (meaning credential files are ignored)
git status --short set-env.cmd set-env.sh

# Double-check .gitignore is working
git check-ignore set-env.cmd set-env.sh
# Expected output:
#   set-env.cmd
#   set-env.sh
```

---

## Tips & Warnings

### ⚠️ Public demo site — be respectful

- QuickPizza at `https://quickpizza.grafana.com/` is a **public demo** — do not run extreme stress tests against it
- The `stress` and `spike` profiles are included for educational purposes; use them cautiously
- Recommended maximum: **50 VUs** for sustained tests against the public site
- If the site rate-limits you, back off and reduce VU count

### 💡 Best practices

- **Always start with a smoke test** to verify your script works before scaling up
- **Use think time** (`sleep()`) between requests to simulate realistic user behaviour — this is already built into the test
- **Monitor the k6 console output** for warnings about dropped iterations or connection errors
- **Set `K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true`** for more accurate percentile calculations in Grafana
- **Set `K6_PROMETHEUS_RW_STALE_MARKERS=true`** so that metrics disappear from dashboards after the test finishes (instead of showing stale flat lines)

### 🔧 Troubleshooting

| Issue                            | Solution                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ERRO[0000] invalid output type` | Your k6 version doesn't support `experimental-prometheus-rw`. Update to k6 ≥ 0.47.0                                |
| No metrics in Grafana            | Verify `K6_PROMETHEUS_RW_SERVER_URL` is the `/api/prom/push` endpoint, not the query endpoint                      |
| 401 / 403 errors from Prometheus | Check `K6_PROMETHEUS_RW_USERNAME` (numeric) and `K6_PROMETHEUS_RW_PASSWORD` (API token with MetricsPublisher role) |
| High error rate in tests         | The public demo site may be under load from others — retry later                                                   |
| `context deadline exceeded`      | Network timeout — check your internet connection or increase k6 timeout settings                                   |

### 📊 Recommended workflow

1. **Develop** — run `smoke` test locally to validate your script
2. **Baseline** — run `average` test with Prometheus output to establish performance baselines
3. **Iterate** — compare subsequent test runs in Grafana to detect regressions
4. **Automate** — integrate into CI/CD using the `smoke` profile with threshold-based pass/fail

---

## Environment Variables Reference

| Variable                                     | Required              | Description                                                   |
| -------------------------------------------- | --------------------- | ------------------------------------------------------------- |
| `TEST_TYPE`                                  | No                    | Test profile: `smoke` (default), `average`, `stress`, `spike` |
| `K6_PROMETHEUS_RW_SERVER_URL`                | For Prometheus output | Grafana Cloud Mimir remote write URL                          |
| `K6_PROMETHEUS_RW_USERNAME`                  | For Prometheus output | Grafana Cloud Prometheus username (numeric ID)                |
| `K6_PROMETHEUS_RW_PASSWORD`                  | For Prometheus output | Grafana Cloud API token                                       |
| `K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM` | No                    | Set `true` for better histogram support                       |
| `K6_PROMETHEUS_RW_STALE_MARKERS`             | No                    | Set `true` to emit stale markers when test ends               |
| `K6_CLOUD_TOKEN`                             | For k6 Cloud output   | k6 Cloud API token                                            |

---

## License

This test suite is provided as-is for educational and testing purposes. QuickPizza is a demo application maintained by [Grafana Labs](https://grafana.com/).
