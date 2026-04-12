@echo off
REM =========================================================================
REM run-tests.cmd - Run QuickPizza k6 load tests on Windows
REM
REM Usage:
REM   run-tests.cmd                     (runs smoke test locally)
REM   run-tests.cmd average             (runs average load test locally)
REM   run-tests.cmd stress              (runs stress test locally)
REM   run-tests.cmd spike               (runs spike test locally)
REM   run-tests.cmd average prometheus  (sends metrics to Grafana Cloud)
REM   run-tests.cmd average cloud       (sends to k6 Cloud)
REM =========================================================================

setlocal enabledelayedexpansion

REM --- Parse arguments ---
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=smoke

set OUTPUT_MODE=%2

echo.
echo =============================================
echo   QuickPizza k6 Load Test Runner
echo   Test type  : %TEST_TYPE%
echo   Output     : %OUTPUT_MODE%
echo =============================================
echo.

REM --- Build the k6 command ---
set K6_CMD=k6 run --env TEST_TYPE=%TEST_TYPE%

if /i "%OUTPUT_MODE%"=="prometheus" (
    echo Sending metrics to Grafana Cloud Prometheus...
    echo.
    echo Make sure these environment variables are set:
    echo   K6_PROMETHEUS_RW_SERVER_URL
    echo   K6_PROMETHEUS_RW_USERNAME
    echo   K6_PROMETHEUS_RW_PASSWORD
    echo.

    if "%K6_PROMETHEUS_RW_SERVER_URL%"=="" (
        echo ERROR: K6_PROMETHEUS_RW_SERVER_URL is not set.
        echo See README.md for setup instructions.
        exit /b 1
    )

    set K6_CMD=!K6_CMD! --out experimental-prometheus-rw
    set K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true
    set K6_PROMETHEUS_RW_STALE_MARKERS=true
)

if /i "%OUTPUT_MODE%"=="cloud" (
    echo Sending results to k6 Cloud...
    echo Make sure K6_CLOUD_TOKEN is set or you are logged in via `k6 login cloud`.
    echo.
    set K6_CMD=!K6_CMD! --out cloud
)

REM --- Run the test ---
echo Running: !K6_CMD! pizza-load-test.js
echo.
!K6_CMD! pizza-load-test.js

echo.
echo Test finished with exit code %ERRORLEVEL%.
endlocal
