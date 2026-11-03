// Supabase Edge Function: upload-photo
// Handles secure photo uploads to the "decoration-images" storage bucket.
// Deploy via: supabase functions deploy upload-photo --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET_NAME = "decoration-images";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req: Request) => {
  // 1. Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables on Edge Function.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Uint8Array;
    let fileType = "image/jpeg";
    let folder = "decorations";
    let originalName = "upload.jpg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      folder = (formData.get("folder") as string) || folder;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided in form-data field 'file'" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return new Response(
          JSON.stringify({
            error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: `File too large (${file.size} bytes). Max limit is 10MB.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      fileType = file.type;
      originalName = file.name;
      const arrayBuf = await file.arrayBuffer();
      fileBuffer = new Uint8Array(arrayBuf);
    } else {
      // JSON with base64 dataUrl
      const body = await req.json();
      folder = body.folder || folder;
      const dataUrl = body.dataUrl || body.image || "";

      if (!dataUrl || typeof dataUrl !== "string") {
        return new Response(JSON.stringify({ error: "Missing 'dataUrl' or 'file' in request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return new Response(JSON.stringify({ error: "Invalid base64 data URL format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      fileType = match[1];
      if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        return new Response(JSON.stringify({ error: `Unsupported image MIME: ${fileType}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawBase64 = match[2];
      const binaryString = atob(rawBase64);
      fileBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileBuffer[i] = binaryString.charCodeAt(i);
      }
    }

    // Generate unique storage path
    const ext = fileType.includes("webp")
      ? "webp"
      : fileType.includes("png")
        ? "png"
        : fileType.includes("gif")
          ? "gif"
          : "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${folder}/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: fileType,
        upsert: true,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("[upload-photo] Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve public URL
    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl: publicUrlData.publicUrl,
        path: storagePath,
        fileType,
        sizeBytes: fileBuffer.length,
        originalName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-photo] Unexpected failure:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
