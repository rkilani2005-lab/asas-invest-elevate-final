import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["pending", "extracting", "reviewing", "processing_media", "uploading"];

export function useQueueCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    async function fetchCount() {
      const { count: c } = await supabase
        .from("import_jobs")
        .select("*", { count: "exact", head: true })
        .in("import_status", ACTIVE_STATUSES);
      setCount(c ?? 0);
    }
    fetchCount();

    // Realtime subscription
    const channel = supabase
      .channel("queue-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "import_jobs" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
