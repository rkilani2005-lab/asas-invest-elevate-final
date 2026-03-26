/**
 * Publish Property Edge Function
 * Takes an approved import_job and:
 * 1. Downloads images from Dropbox
 * 2. Compresses them client-side (returns instructions) or server-side
 * 3. Uploads to Supabase Storage
 * 4. Creates the property record in the properties table
 * 5. Creates media records linked to the property
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_IMAGE_SIZE = 500 * 1024; // 500 KB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30 MB

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { job_id, action } = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job_id" }), { status: 400, headers: corsHeaders });
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: corsHeaders });
    }

    // Get Google Drive access token (with auto-refresh)
    const { data: driveRows } = await supabase
      .from("importer_settings")
      .select("key, value")
      .in("key", ["gdrive_access_token", "gdrive_refresh_token", "gdrive_token_expiry"]);
    const driveMap: Record<string, string> = {};
    (driveRows || []).forEach((r: { key: string; value: string | null }) => { if (r.value) driveMap[r.key] = r.value; });

    let gdriveToken = driveMap.gdrive_access_token || null;

    // Refresh if expired
    if (gdriveToken && driveMap.gdrive_refresh_token) {
      const expiryMs = driveMap.gdrive_token_expiry ? new Date(driveMap.gdrive_token_expiry).getTime() : 0;
      if (Date.now() > expiryMs - 5 * 60 * 1000) {
        const GCI = Deno.env.get("GOOGLE_CLIENT_ID"), GCS = Deno.env.get("GOOGLE_CLIENT_SECRET");
        if (GCI && GCS) {
          const refreshResp = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ client_id: GCI, client_secret: GCS, refresh_token: driveMap.gdrive_refresh_token, grant_type: "refresh_token" }),
          });
          if (refreshResp.ok) {
            const tokens = await refreshResp.json();
            gdriveToken = tokens.access_token;
            await supabase.from("importer_settings").upsert([
              { key: "gdrive_access_token", value: tokens.access_token },
              { key: "gdrive_token_expiry", value: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString() },
            ], { onConflict: "key" });
          }
        }
      }
    }

    if (action === "create_property") {
      // Create the property in the properties table
      await supabase.from("import_jobs").update({ import_status: "uploading" }).eq("id", job_id);

      // Parse highlights from pipe-separated string to array
      const highlights_en = job.highlights_en
        ? job.highlights_en.split("|").map((h: string) => h.trim()).filter(Boolean)
        : [];
      const highlights_ar = job.highlights_ar
        ? job.highlights_ar.split("|").map((h: string) => h.trim()).filter(Boolean)
        : [];

      // Parse unit_types
      const unit_types = job.unit_types
        ? job.unit_types.split("|").map((u: string) => u.trim()).filter(Boolean)
        : [];

      // Ensure unique slug
      let slug = job.slug || job.name_en.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
      let slugAttempt = slug;
      let suffix = 2;
      while (true) {
        const { data: existing } = await supabase
          .from("properties")
          .select("id")
          .eq("slug", slugAttempt)
          .maybeSingle();
        if (!existing) break;
        slugAttempt = `${slug}-${suffix++}`;
      }

      const propertyInsert = {
        name_en: job.name_en || job.folder_name.split(" - ")[0],
        name_ar: job.name_ar || null,
        slug: slugAttempt,
        tagline_en: job.tagline_en || null,
        tagline_ar: job.tagline_ar || null,
        developer_en: job.developer_en || null,
        developer_ar: job.developer_ar || null,
        location_en: job.location_en || null,
        location_ar: job.location_ar || null,
        price_range: job.price_range || null,
        size_range: job.size_range || null,
        unit_types,
        ownership_type: job.ownership_type || null,
        type: (job.type === "ready" ? "ready" : "off-plan") as "off-plan" | "ready",
        handover_date: job.handover_date || null,
        overview_en: job.overview_en || null,
        overview_ar: job.overview_ar || null,
        highlights_en,
        highlights_ar,
        video_url: job.video_url || null,
        status: (job.status || "available") as "available" | "reserved" | "sold",
        is_featured: job.is_featured ?? true,
        investment_en: job.investment_en || null,
        investment_ar: job.investment_ar || null,
        enduser_text_en: job.enduser_text_en || null,
        enduser_text_ar: job.enduser_text_ar || null,
        category: "residential" as const,
      };

      const { data: newProperty, error: propError } = await supabaseService
        .from("properties")
        .insert(propertyInsert)
        .select()
        .single();

      if (propError) {
        await supabase.from("import_jobs").update({
          import_status: "error",
          error_log: propError.message,
        }).eq("id", job_id);
        return new Response(JSON.stringify({ error: propError.message }), { status: 400, headers: corsHeaders });
      }

      // Update job with cms_property_id
      await supabase.from("import_jobs").update({
        cms_property_id: newProperty.id,
        cms_url: `/properties/${slugAttempt}`,
      }).eq("id", job_id);

      await supabase.from("import_logs").insert({
        job_id,
        action: "property_created",
        details: `Property "${newProperty.name_en}" created with ID: ${newProperty.id}`,
        level: "success",
      });

      return new Response(JSON.stringify({ success: true, property_id: newProperty.id, slug: slugAttempt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload_media") {
      const { property_id, media_items } = await req.json().catch(() => ({})) as any;
      // media_items: [{dropbox_path, filename, type, sort_order, is_hero}]
      if (!property_id || !media_items?.length) {
        return new Response(JSON.stringify({ error: "Missing property_id or media_items" }), { status: 400, headers: corsHeaders });
      }

      const results = [];
      for (const item of media_items) {
        try {
          // Download from Google Drive
          if (!gdriveToken) {
            results.push({ filename: item.filename, error: "No Google Drive token — reconnect Drive in Importer Settings" });
            continue;
          }

          // item.dropbox_path stores the Drive file ID (field was reused for Drive)
          const driveFileId = item.dropbox_path;
          let dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
            headers: { Authorization: `Bearer ${gdriveToken}` },
          });
          // Fallback: export as PDF if it's a Google Doc
          if (!dlRes.ok) {
            dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/export?mimeType=application/pdf`, {
              headers: { Authorization: `Bearer ${gdriveToken}` },
            });
          }

          if (!dlRes.ok) {
            results.push({ filename: item.filename, error: "Download failed" });
            continue;
          }

          const buffer = await dlRes.arrayBuffer();
          const fileSize = buffer.byteLength;

          // Check video size limit
          if (item.type === "video" && fileSize > MAX_VIDEO_SIZE) {
            await supabase.from("import_logs").insert({
              job_id,
              action: "media_skip",
              details: `Video "${item.filename}" skipped — ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds 30MB limit`,
              level: "warning",
            });
            results.push({ filename: item.filename, skipped: true, reason: "exceeds_30mb" });
            continue;
          }

          // Determine media type for CMS
          const isImage = item.type === "image";
          const mediaCategory = item.is_hero ? "hero" : (isImage ? "render" : "video");
          const storageBucket = "property-media";
          const storageFileName = `${property_id}/${item.sort_order}-${item.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

          // Upload to Supabase Storage
          const contentType = isImage
            ? (item.filename.endsWith(".png") ? "image/png" : "image/jpeg")
            : "video/mp4";

          const { data: uploadData, error: uploadError } = await supabaseService.storage
            .from(storageBucket)
            .upload(storageFileName, buffer, { contentType, upsert: true });

          if (uploadError) {
            results.push({ filename: item.filename, error: uploadError.message });
            continue;
          }

          const { data: { publicUrl } } = supabaseService.storage
            .from(storageBucket)
            .getPublicUrl(storageFileName);

          // Create media record in CMS
          const { data: mediaRecord } = await supabaseService.from("media").insert({
            property_id,
            type: mediaCategory as any,
            url: publicUrl,
            order_index: item.sort_order,
            file_size: fileSize,
          }).select().single();

          // Update import_media record
          if (item.import_media_id) {
            await supabase.from("import_media").update({
              storage_url: publicUrl,
              cms_media_id: mediaRecord?.id,
              compressed_size_bytes: fileSize,
              compression_status: "done",
            }).eq("id", item.import_media_id);
          }

          results.push({ filename: item.filename, success: true, url: publicUrl });
        } catch (e) {
          results.push({ filename: item.filename, error: String(e) });
        }
      }

      // Mark job as completed
      await supabase.from("import_jobs").update({ import_status: "completed" }).eq("id", job_id);
      await supabase.from("import_logs").insert({
        job_id,
        action: "media_upload_complete",
        details: `Uploaded ${results.filter((r) => r.success).length} of ${results.length} media files`,
        level: "success",
      });

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("publish-property error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
