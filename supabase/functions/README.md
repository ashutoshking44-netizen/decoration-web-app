# Supabase Edge Functions

This folder contains serverless Edge Functions running on Deno runtime for Supabase.

---

## Functions

### `upload-photo`

- **Path**: `supabase/functions/upload-photo/index.ts`
- **Purpose**: Uploads image files (multipart/form-data or base64 data URLs) to the `decoration-images` storage bucket.
- **Validations**: Max 10MB, verifies MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), and sets 1-year cache headers.

---

## Local Development & Testing

Serve functions locally:

```bash
supabase functions serve upload-photo --no-verify-jwt
```

Test with curl:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/upload-photo' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --form 'file=@/path/to/stage-photo.jpg' \
  --form 'folder=decorations'
```

---

## Deployment to Supabase Project

Deploy directly to your connected Supabase project:

```bash
supabase functions deploy upload-photo --no-verify-jwt
```
