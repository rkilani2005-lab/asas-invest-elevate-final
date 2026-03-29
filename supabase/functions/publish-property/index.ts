/**
 * Publish Property Edge Function — V2
 * Handles:
 * 1. Create OR Update property (duplicate detection)
 * 2. Upload media to Supabase Storage
 * 3. Save payment milestones
 * 4. Save amenities
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_VIDEO_SIZE = 30 * 1024 * 1024;

async function getGDriveToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: rows } = await supabase
    .from("importer_settings").select("key, value")
    .in("key", ["gdrive_access_token", "gdrive_refresh_token", "gdrive_token_expiry"]);
  const map: Record<string, string> = {};
  (rows || []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });

  let token = map.gdrive_access_token || null;
  if (!token) return null;

  const expiryMs = map.gdrive_token_expiry ? new Date(map.gdrive_token_expiry).getTime() : 0;
  if (Date.now() > expiryMs - 5 * 60 * 1000 && map.gdrive_refresh_token) {
    const GCI = Deno.env.get("GOOGLE_CLIENT_ID"), GCS = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (GCI && GCS) {
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: GCI, client_secret: GCS, refresh_token: map.gdrive_refresh_token, grant_type: "refresh_token" }),
      });
      if (r.ok) {
        const t = await r.json();
        token = t.access_token;
        await supabase.from("importer_settings").upsert([
          { key: "gdrive_access_token", value: t.access_token },
          { key: "gdrive_token_expiry", value: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString() },
        ], { onConflict: "key" } as any);
      }
    }
  }
  return token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseService = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { job_id, action } = body;

    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job_id" }), { status: 400, headers: corsHeaders });
    }

    const { data: job, error: jobError } = await supabase.from("import_jobs").select("*").eq("id", job_id).single();
    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: corsHeaders });
    }

    const gdriveToken = await getGDriveToken(supabase as any);

    // ── CREATE OR UPDATE PROPERTY ─────────────────────────────────────────────
    if (action === "create_property") {
      await supabase.from("import_jobs").update({ import_status: "uploading" }).eq("id", job_id);

      const highlights_en = job.highlights_en
        ? job.highlights_en.split("|").map((h: string) => h.trim()).filter(Boolean) : [];
      const highlights_ar = job.highlights_ar
        ? job.highlights_ar.split("|").map((h: string) => h.trim()).filter(Boolean) : [];
      const unit_types = job.unit_types
        ? job.unit_types.split("|").map((u: string) => u.trim()).filter(Boolean) : [];

      // Check if this is a duplicate (update existing property)
      const aiRaw = (job.ai_extraction_raw as Record<string, unknown>) || {};
      const existingPropertyId = (job.cms_property_id || aiRaw._duplicate_property_id) as string | null;

      const propertyData = {
        name_en: job.name_en || job.folder_name.split(" - ")[0],
        name_ar: job.name_ar || null,
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

      let propertyId: string;
      let propertySlug: string;

      if (existingPropertyId) {
        // UPDATE existing property
        const { data: updated, error: updateErr } = await supabaseService
          .from("properties").update(propertyData)
          .eq("id", existingPropertyId).select("id, slug").single();

        if (updateErr) {
          await supabase.from("import_jobs").update({ import_status: "error", error_log: updateErr.message }).eq("id", job_id);
          return new Response(JSON.stringify({ error: updateErr.message }), { status: 400, headers: corsHeaders });
        }

        propertyId = updated.id;
        propertySlug = updated.slug;
        await supabase.from("import_logs").insert({
          job_id, action: "property_updated",
          details: `Updated existing property "${propertyData.name_en}" (ID: ${propertyId})`,
          level: "success",
        });
      } else {
        // CREATE new property — ensure unique slug
        let slug = job.slug || job.name_en?.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() || "property";
        let slugAttempt = slug;
        let suffix = 2;
        while (true) {
          const { data: existing } = await supabase.from("properties").select("id").eq("slug", slugAttempt).maybeSingle();
          if (!existing) break;
          slugAttempt = `${slug}-${suffix++}`;
        }

        const { data: newProp, error: propError } = await supabaseService
          .from("properties").insert({ ...propertyData, slug: slugAttempt }).select().single();

        if (propError) {
          await supabase.from("import_jobs").update({ import_status: "error", error_log: propError.message }).eq("id", job_id);
          return new Response(JSON.stringify({ error: propError.message }), { status: 400, headers: corsHeaders });
        }

        propertyId = newProp.id;
        propertySlug = slugAttempt;
        await supabase.from("import_logs").insert({
          job_id, action: "property_created",
          details: `Created property "${newProp.name_en}" (ID: ${propertyId})`,
          level: "success",
        });
      }

      // Save payment milestones from AI extraction
      const paymentMilestones = (aiRaw._payment_milestones as any[]) || [];
      if (paymentMilestones.length > 0) {
        // Delete existing milestones for this property
        await supabaseService.from("payment_milestones").delete().eq("property_id", propertyId);
        const milestonesToInsert = paymentMilestones.map((m: any) => ({
          property_id: propertyId,
          milestone_en: m.milestone_en || m.milestone || "Milestone",
          milestone_ar: m.milestone_ar || null,
          percentage: m.percentage || 0,
          sort_order: m.sort_order || 0,
        }));
        await supabaseService.from("payment_milestones").insert(milestonesToInsert);
        await supabase.from("import_logs").insert({
          job_id, action: "milestones_saved",
          details: `Saved ${milestonesToInsert.length} payment milestones`,
          level: "success",
        });
      }

      // Save amenities from AI extraction
      const amenities = (aiRaw._amenities as any[]) || [];
      if (amenities.length > 0) {
        // Delete existing amenities for this property
        await supabaseService.from("amenities").delete().eq("property_id", propertyId);
        const amenitiesToInsert = amenities.map((a: any) => ({
          property_id: propertyId,
          name_en: a.name_en || a.name || "Amenity",
          name_ar: a.name_ar || null,
          icon: a.icon || "Star",
          category: a.category || "General",
        }));
        await supabaseService.from("amenities").insert(amenitiesToInsert);
        await supabase.from("import_logs").insert({
          job_id, action: "amenities_saved",
          details: `Saved ${amenitiesToInsert.length} amenities`,
          level: "success",
        });
      }

      // Update job with CMS property ID
      await supabase.from("import_jobs").update({
        cms_property_id: propertyId,
        cms_url: `/properties/${propertySlug}`,
      }).eq("id", job_id);

      return new Response(JSON.stringify({
        success: true,
        property_id: propertyId,
        slug: propertySlug,
        action: existingPropertyId ? "updated" : "created",
        payment_milestones: paymentMilestones.length,
        amenities: amenities.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── UPLOAD MEDIA ──────────────────────────────────────────────────────────
    if (action === "upload_media") {
      const { property_id, media_items } = body;
      if (!property_id || !media_items?.length) {
        return new Response(JSON.stringify({ error: "Missing property_id or media_items" }), { status: 400, headers: corsHeaders });
      }

      if (!gdriveToken) {
        return new Response(JSON.stringify({ error: "No Google Drive token" }), { status: 400, headers: corsHeaders });
      }

      const results = [];
      for (const item of media_items) {
        try {
          const driveFileId = item.dropbox_path;
          let dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
            headers: { Authorization: `Bearer ${gdriveToken}` },
          });
          if (!dlRes.ok) {
            dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/export?mimeType=application/pdf`, {
              headers: { Authorization: `Bearer ${gdriveToken}` },
            });
          }

          if (!dlRes.ok) { results.push({ filename: item.filename, error: "Download failed" }); continue; }

          const buffer = await dlRes.arrayBuffer();
          const fileSize = buffer.byteLength;

          if (item.type === "video" && fileSize > MAX_VIDEO_SIZE) {
            await supabase.from("import_logs").insert({
              job_id, action: "media_skip",
              details: `Video "${item.filename}" skipped — ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds 30MB limit`,
              level: "warning",
            });
            results.push({ filename: item.filename, skipped: true, reason: "exceeds_30mb" });
            continue;
          }

          const isImage = item.type === "image" || item.type === "hero" || item.type === "render" || item.type === "interior" || item.type === "floorplan";
          const isBrochure = item.type === "brochure";
          const mediaType = item.is_hero ? "hero" : (item.type || "render");
          const storageBucket = "property-media";
          const storageFileName = `${property_id}/${item.sort_order}-${item.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

          const contentType = isBrochure ? "application/pdf"
            : isImage ? (item.filename.endsWith(".png") ? "image/png" : "image/jpeg")
            : "video/mp4";

          const { error: uploadError } = await supabaseService.storage
            .from(storageBucket).upload(storageFileName, buffer, { contentType, upsert: true });

          if (uploadError) { results.push({ filename: item.filename, error: uploadError.message }); continue; }

          const { data: { publicUrl } } = supabaseService.storage
            .from(storageBucket).getPublicUrl(storageFileName);

          // Create media record
          const { data: mediaRecord } = await supabaseService.from("media").insert({
            property_id,
            type: mediaType as any,
            url: publicUrl,
            order_index: item.sort_order,
            file_size: fileSize,
          }).select().single();

          // Update import_media
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

      await supabase.from("import_jobs").update({ import_status: "completed" }).eq("id", job_id);
      await supabase.from("import_logs").insert({
        job_id, action: "media_upload_complete",
        details: `Uploaded ${results.filter(r => r.success).length} of ${results.length} media files`,
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
