import { AccountMenu } from "@/components/account-menu";
import { NotificationsBellLink } from "@/components/notifications-bell-link";
import { PrefetchLink } from "@/components/prefetch-link";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const navLinkClass =
  "inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm font-semibold text-foreground/78 transition hover:bg-surface-muted hover:text-foreground";

export async function SiteHeader() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let unreadNotifications = 0;
  let firstName: string | null = null;
  let displayName: string | null = null;

  if (user) {
    firstName = getUserFirstName(user);
    displayName = getUserDisplayName(user);

    const [{ count }, profileResult] = await Promise.all([
      supabase
        .from("in_app_notifications")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", user.id)
        .is("read_at", null),
      supabase
        .from("profiles")
        .select("first_name, display_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    unreadNotifications = count ?? 0;

    if (profileResult.data?.first_name) {
      firstName = profileResult.data.first_name;
    }

    if (profileResult.data?.display_name) {
      displayName = profileResult.data.display_name;
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 md:px-6">
        <PrefetchLink
          className="text-sm font-semibold tracking-tight text-foreground"
          href="/"
        >
          My Crew Connections
        </PrefetchLink>
        <nav
          aria-label="Site"
          className="flex flex-wrap items-center justify-end gap-1"
        >
          <PrefetchLink className={navLinkClass} href="/pricing">
            Pricing
          </PrefetchLink>
          {user ? (
            <>
              <PrefetchLink className={navLinkClass} href="/dashboard">
                Dashboard
              </PrefetchLink>
              <NotificationsBellLink unreadCount={unreadNotifications} />
              <AccountMenu
                displayName={displayName}
                email={user.email ?? "Signed in"}
                firstName={firstName}
              />
            </>
          ) : (
            <>
              <PrefetchLink className={navLinkClass} href="/auth">
                Sign in
              </PrefetchLink>
              <PrefetchLink
                className="button-primary button-compact"
                href="/auth/create"
              >
                Sign up
              </PrefetchLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
