"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function useLoginBackground(): { url: string | null } {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    supabase.storage
      .from("ATZ_SED")
      .list("login-background", { limit: 50 })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return;
        const file = data[Math.floor(Math.random() * data.length)];
        const { data: publicData } = supabase.storage
          .from("ATZ_SED")
          .getPublicUrl("login-background/" + file.name);
        setUrl(publicData.publicUrl);
      });
  }, []);

  return { url };
}
