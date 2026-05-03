"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function RealtimeRefresh({
  userId,
  email,
}: Readonly<{
  userId: string;
  email?: string | null;
}>) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const normalizedEmail = email?.trim().toLowerCase();

    const scheduleRefresh = () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = setTimeout(() => {
        router.refresh();
      }, 180);
    };

    const channels = [
      supabase
        .channel(`in-app-notifications-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "in_app_notifications", filter: `user_id=eq.${userId}` },
          scheduleRefresh,
        )
        .subscribe(),
      supabase
        .channel(`connections-owned-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "connections", filter: `owner_user_id=eq.${userId}` },
          scheduleRefresh,
        )
        .subscribe(),
      supabase
        .channel(`connection-invites-owned-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "connection_invites", filter: `owner_user_id=eq.${userId}` },
          scheduleRefresh,
        )
        .subscribe(),
      supabase
        .channel(`hangouts-owned-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "hangouts", filter: `owner_user_id=eq.${userId}` },
          scheduleRefresh,
        )
        .subscribe(),
      supabase
        .channel(`hangout-participants-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "hangout_participants", filter: `participant_user_id=eq.${userId}` },
          scheduleRefresh,
        )
        .subscribe(),
    ];

    if (normalizedEmail) {
      channels.push(
        supabase
          .channel(`connection-invites-incoming-${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "connection_invites", filter: `invited_email=eq.${normalizedEmail}` },
            scheduleRefresh,
          )
          .subscribe(),
      );
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const onFocus = () => router.refresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);

      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }

      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [email, router, userId]);

  return null;
}
