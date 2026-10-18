# Docker Deployment & Cross-Platform Execution

This directory provides containerized configurations for running the **Decoration Web App** on any platform (macOS, Windows with WSL2/Docker Desktop, Linux, or Cloud VM) with zero environment differences.

---

## 1. Quick Start

### Development Mode (with hot-reload)

From the project root:

```bash
docker compose -f docker/docker-compose.yml up --build
```

Or directly inside `docker/`:

```bash
cd docker
docker compose up --build
```

- **Web Dashboard**: [http://localhost:5174](http://localhost:5174)
- **API Server & Health**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Prometheus Metrics**: [http://localhost:4000/api/metrics](http://localhost:4000/api/metrics)

---

## 2. Production Container Build

To build and run the optimized standalone production container:

```bash
docker build -t decoration-app -f docker/Dockerfile --target production .
docker run -p 5174:5174 -p 4000:4000 --env-file .env decoration-app
```

---

## 3. Stopping Containers

```bash
docker compose -f docker/docker-compose.yml down
```
