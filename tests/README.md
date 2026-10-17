# Project Test Suites

This directory contains automated unit, integration, and end-to-end tests for the Decoration Web App.

---

## Directory Layout

- `unit/`: Fast unit tests for pure functions, math invariants, validators, and formatters.
- `integration/`: Tests verifying database access, repository backups, API health, and Supabase services.

---

## Running Tests

### Run all tests

```bash
npm test
```

### Run unit tests with Bun

```bash
bun test tests/unit/
```

### Run database tests with Supabase

```bash
supabase test db
```

### Run stress & load tests

```bash
npm run test:load
```
