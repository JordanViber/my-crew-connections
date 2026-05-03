import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { PrefetchLink } from "@/components/prefetch-link";
import { clearInAppNotificationsAction, markInAppNotificationReadAction } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProfileRow = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

type NotificationRow = {
  id: string;
  category: string | null;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function getNotificationCenterBody(notification: NotificationRow) {
  const normalizedCategory = (notification.category ?? "").replaceAll("_", "-");

  if (normalizedCategory.startsWith("connection-invite")) {
    return notification.body
      .replace("Open the app to review it.", "Review it in your dashboard.")
      .replace("Open the app to review the invite and choose what to do next.", "Review it in your dashboard.");
  }

  return notification.body;
}

function getDisplayName(profile: ProfileRow | null, email?: string | null) {
  return profile?.display_name
    ?? (`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || email?.split("@")[0] || "Your account");
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/notifications");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: notifications, error } = await supabase
    .from("in_app_notifications")
    .select("id, category, title, body, href, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  const rows = (notifications ?? []) as NotificationRow[];
  const unreadCount = rows.filter((row) => row.read_at === null).length;
  const displayName = getDisplayName(profile as ProfileRow | null, user.email);
  const unreadLabel = unreadCount === 1
    ? "1 unread notification"
    : `${unreadCount} unread notifications`;

  return (
    <AppShell
      title="Notifications"
      subtitle="Updates about invites, plans, and responses across your crew."
      email={user.email ?? "Signed in"}
      firstName={(profile as ProfileRow | null)?.first_name}
      displayName={displayName}
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        <section className="rounded-lg border border-border bg-surface-strong p-4 shadow-(--shadow-tight)">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground/72">
              {unreadCount > 0 ? unreadLabel : "All caught up"}
            </p>
            <form action={clearInAppNotificationsAction}>
              <input name="redirectTo" type="hidden" value="/notifications" />
              <button className="button-secondary" type="submit" disabled={unreadCount === 0}>
                Clear all read
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-3">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-sm text-foreground/62">
              You do not have notifications yet.
            </div>
          ) : (
            rows.map((notification) => {
              const isUnread = notification.read_at === null;

              return (
                <article key={notification.id} className="rounded-lg border border-border bg-surface-strong p-4 shadow-(--shadow-tight)">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isUnread ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#2a74ff]" aria-hidden="true" />
                        ) : null}
                        <h2 className="text-base font-semibold text-foreground">{notification.title}</h2>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground/72">{getNotificationCenterBody(notification)}</p>
                      <p className="mt-2 text-xs text-foreground/54">{dateFormatter.format(new Date(notification.created_at))}</p>
                    </div>

                    {isUnread ? (
                      <form action={markInAppNotificationReadAction}>
                        <input name="notificationId" type="hidden" value={notification.id} />
                        <input name="redirectTo" type="hidden" value="/notifications" />
                        <PendingSubmitButton
                          className="button-secondary button-compact"
                          idleLabel="Mark read"
                          pendingLabel="Marking..."
                        />
                      </form>
                    ) : null}
                  </div>

                  {notification.href ? (
                    <div className="mt-3">
                      <PrefetchLink className="button-secondary button-compact" href={notification.href}>
                        Open
                      </PrefetchLink>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
