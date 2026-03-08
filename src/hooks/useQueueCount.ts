import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["pending", "extracting", "reviewing", "processing_media", "uploading"];

async function fetchQueueCount() {
  const { count } = await supabase
    .from("import_jobs")
    .select("*", { count: "exact", head: true })
    .in("import_status", ACTIVE_STATUSES);
  return count ?? 0;
}

async function fetchNewSubmissionsCount() {
  const { count } = await supabase
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
}

export function useQueueCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchQueueCount().then(setCount);

    const channel = supabase
      .channel("queue-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "import_jobs" }, () =>
        fetchQueueCount().then(setCount)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}

export function useNewSubmissionsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchNewSubmissionsCount().then(setCount);

    const channel = supabase
      .channel("submissions-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "form_submissions" }, () =>
        fetchNewSubmissionsCount().then(setCount)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}
