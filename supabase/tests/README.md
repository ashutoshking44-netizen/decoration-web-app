# Supabase Database Tests

Database and schema verification tests using pgTAP.

---

## Running Database Tests

Run all tests against your local Supabase stack:

```bash
supabase test db
```

Or run a specific test file:

```bash
supabase test db supabase/tests/database.test.sql
```

---

## Test Coverage

- **Table Existence**: Verifies `decorations`, `enquiries`, `booked_clients`, `company_profiles`, `payment_qrs`.
- **Column Integrity**: Asserts `company_id`, `enquiry_id`, and `components` JSON schemas are present.
- **Storage Buckets**: Validates `decoration-images` bucket existence and read/write access.
