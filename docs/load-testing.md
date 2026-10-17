# Load & Stress Testing Guide

This project includes automated load testing configurations powered by [k6](https://k6.io).

---

## 1. Prerequisites

Install `k6` on your machine:
* **macOS (Homebrew)**: `brew install k6`
* **Windows (Chocolatey)**: `choco install k6`
* **Linux / Docker**: `docker run -i grafana/k6 run - <scripts/load-test.js`

---

## 2. Running Load Tests

### Step 1: Start the API Server
In one terminal window, start the server:
```bash
npm run api
```

### Step 2: Execute the Load Test
In another terminal, run:
```bash
npm run test:load
```
*Or target a remote / staging deployment:*
```bash
k6 run -e TARGET_URL=https://your-staging-domain.com scripts/load-test.js
```

---

## 3. Test Stages & Concurrency Profile

The test simulates realistic client traffic and quotation activity:
* **Stage 1 (10s)**: Ramp-up from 0 to 10 concurrent virtual users.
* **Stage 2 (30s)**: Steady load at 30 concurrent users querying catalogue items and submitting enquiries.
* **Stage 3 (10s)**: Spike test jumping to 50 concurrent virtual users.
* **Stage 4 (10s)**: Ramp-down back to 0.

---

## 4. Performance Thresholds

The load test asserts strict production readiness criteria:
* **Latency (p95)**: 95% of all HTTP requests must respond in **under 300ms**.
* **Reliability (Failure Rate)**: Less than **1%** of requests may fail (`rate < 0.01`).
