# Observability, Metrics & System Health

This document outlines the monitoring and observability architecture for the Decoration Web App.

---

## 1. Endpoints Overview

The application API exposes standard observability endpoints on port `4000` (or configured `API_PORT`):

### `GET /api/health`
Returns system health, database statistics, and memory usage.

**Example Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-17T07:22:15.000Z",
  "uptimeSeconds": 1420,
  "database": {
    "decorationsCount": 18,
    "enquiriesCount": 42,
    "connected": true
  },
  "system": {
    "memoryRssBytes": 42991616,
    "heapUsedBytes": 16428416,
    "heapTotalBytes": 28450816
  }
}
```

### `GET /api/metrics`
Exposes Prometheus-formatted metrics for Prometheus scraping and Grafana dashboards.

**Sample Metrics:**
```prometheus
# HELP decoration_uptime_seconds Total uptime of the API server in seconds
# TYPE decoration_uptime_seconds gauge
decoration_uptime_seconds 1420

# HELP decoration_requests_total Total number of HTTP requests processed
# TYPE decoration_requests_total counter
decoration_requests_total 315

# HELP decoration_items_total Total decorations currently stored in database
# TYPE decoration_items_total gauge
decoration_items_total 18

# HELP decoration_enquiries_total Total enquiries currently stored in database
# TYPE decoration_enquiries_total gauge
decoration_enquiries_total 42

# HELP decoration_memory_bytes Process memory usage in bytes
# TYPE decoration_memory_bytes gauge
decoration_memory_bytes{type="rss"} 42991616
decoration_memory_bytes{type="heapTotal"} 28450816
decoration_memory_bytes{type="heapUsed"} 16428416

decoration_http_requests{method="GET",path="/api/decorations"} 210
decoration_http_requests{method="POST",path="/api/enquiries"} 42
decoration_http_requests{method="GET",path="/api/health"} 63
```

---

## 2. Prometheus Configuration (`prometheus.yml`)

Add the following scrape job to your Prometheus server configuration:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "decoration-api"
    static_configs:
      - targets: ["localhost:4000"]
    metrics_path: "/api/metrics"
```

---

## 3. Grafana Dashboard Integration

Once Prometheus is scraping the endpoint, you can visualize the following in Grafana:
* **Uptime & Availability**: `decoration_uptime_seconds`
* **Request Throughput (RPS)**: `rate(decoration_requests_total[1m])`
* **Memory Utilization**: `decoration_memory_bytes{type="heapUsed"} / 1024 / 1024` (MB)
* **Active Catalogue Items**: `decoration_items_total`
* **Incoming Enquiries Growth**: `rate(decoration_enquiries_total[5m])`
