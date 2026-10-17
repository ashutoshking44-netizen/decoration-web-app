/**
 * k6 Load Testing Script for Decoration Portal API
 *
 * Requirements:
 * Install k6 (macOS: `brew install k6`, Windows: `choco install k6` or download binary)
 *
 * Usage:
 * Start the API server: `npm run api`
 * Run load test: `k6 run scripts/load-test.js`
 * Or pass target URL: `k6 run -e TARGET_URL=http://localhost:4000 scripts/load-test.js`
 */

import http from "k6/http";
import { check, sleep } from "k6";

const TARGET_URL = __ENV.TARGET_URL || "http://localhost:4000";

export const options = {
  stages: [
    { duration: "10s", target: 10 }, // Ramp-up to 10 users
    { duration: "30s", target: 30 }, // Stay at 30 concurrent users
    { duration: "10s", target: 50 }, // Spike to 50 users
    { duration: "10s", target: 0 }, // Ramp-down
  ],
  thresholds: {
    // 95% of requests must complete within 300ms
    http_req_duration: ["p(95)<300"],
    // Error rate must remain below 1%
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // 1. Health check endpoint
  const healthRes = http.get(`${TARGET_URL}/api/health`);
  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
    "health reports ok": (r) => {
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
  });

  // 2. Fetch live decorations catalog
  const catalogRes = http.get(`${TARGET_URL}/api/decorations?status=live`);
  check(catalogRes, {
    "catalog status is 200": (r) => r.status === 200,
    "catalog returns decorations": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).decorations);
      } catch {
        return false;
      }
    },
  });

  // 3. Prometheus metrics endpoint
  const metricsRes = http.get(`${TARGET_URL}/api/metrics`);
  check(metricsRes, {
    "metrics status is 200": (r) => r.status === 200,
    "metrics contain decoration_requests_total": (r) =>
      r.body.includes("decoration_requests_total"),
  });

  // 4. Submit sample client enquiry
  const payload = JSON.stringify({
    name: "Load Test Client",
    phone: "9800000000",
    email: "loadtest@example.com",
    venue: "Kathmandu Grand Banquet",
    events: [
      {
        eventName: "Wedding",
        requested_decorations: [
          {
            id: "dec-load-test-1",
            title: "Royal Stage",
            price: 75000,
          },
        ],
        subtotal: 75000,
      },
    ],
    grandTotal: 75000,
  });

  const enquiryRes = http.post(`${TARGET_URL}/api/enquiries`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(enquiryRes, {
    "enquiry status is 201": (r) => r.status === 201,
    "enquiry has id": (r) => {
      try {
        return Boolean(JSON.parse(r.body).id);
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
