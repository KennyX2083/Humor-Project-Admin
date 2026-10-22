import { cache, Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import type { AdminSection, AdminSearchParams } from "../../lib/admin-page-types";
import GoogleSignInButton from "./google-sign-in-button";
import SignOutButton from "./google-sign-out-button";
import AdminNavigation from "./admin-navigation";
import StatsView from "./admin-views/stats-view";
import UsersView from "./admin-views/users-view";
import ExcusesView from "./admin-views/excuses-view";
import RatingsView from "./admin-views/ratings-view";

const pages = {
  stats: { title: "Stats", description: "Explore activity, game comparisons, and the most accepted excuses." },
  users: { title: "Users", description: "Review the players and their profile details." },
  excuses: { title: "Excuses", description: "Generate, review, edit, and manage published excuses." },
  ratings: { title: "Rating", description: "Review player verdicts and filter the voting activity." },
};


// React cache deduplicates these reads only within the current server render.
const readAdminContext = cache(async () => {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, profile: null, profileError: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, is_superadmin")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile, profileError };
});

async function AdminAccount() {
  const { user, profile, profileError } = await readAdminContext();
  if (!user) return null;

  const isAdmin = !profileError && profile?.is_superadmin === true;
  const name = [profile?.first_name, profile?.last_name]
    .filter(Boolean).join(" ") || "administrator";

  return (
    <div className="header-account">
      {isAdmin && <p>Welcome, {name}!</p>}
      <SignOutButton />
    </div>
  );
}

export default function AdminScreen({ section, searchParams }: {
  section: AdminSection;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <main className="admin-shell">
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">e.</span>
          Excuse Queue
        </Link>
        <div className="header-tools">
          <AdminNavigation active={section} />
          <Suspense fallback={<span className="header-account" role="status">Checking account…</span>}>
            <AdminAccount />
          </Suspense>
        </div>
      </header>
      <section className="hero" aria-labelledby="admin-title">
        <p className="eyebrow">Admin / Control room</p>
        <h1 id="admin-title">{pages[section].title}</h1>
        <p className="hero-description">{pages[section].description}</p>
      </section>
      <div className="admin-content">
        <Suspense fallback={<p className="empty-state" role="status">Loading admin page…</p>}>
          <AdminContent section={section} searchParams={searchParams} />
        </Suspense>
      </div>
      <footer className="site-footer">Excuse Queue / Administration</footer>
    </main>
  );
}

async function AdminContent({ section, searchParams }: {
  section: AdminSection;
  searchParams: Promise<AdminSearchParams>;
}) {
  const { supabase, user, profile, profileError } = await readAdminContext();

  if (!user) {
    return <><p>Sign in with Google to access the admin panel.</p><GoogleSignInButton /></>;
  }

  if (profileError || !profile) {
    return <p role="alert">Could not verify admin permissions.</p>;
  }

  if (profile.is_superadmin !== true) {
    return <p role="alert">Access denied. This account is not an administrator.</p>;
  }

  const params = await searchParams;
  const View = { stats: StatsView, users: UsersView, excuses: ExcusesView, ratings: RatingsView }[section];
  return <View supabase={supabase} params={params} userId={user.id} />;
}
