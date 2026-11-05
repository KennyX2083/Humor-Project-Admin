import { cache, Suspense } from "react";
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

import { RequestsView, ResponsesView } from "./admin-views/generation-logs-view";

import { ProvidersView, ModelsView } from "./admin-views/model-config-view";

import { ChainsView, ChainStepsView } from "./admin-views/prompt-chains-view";

import ChainMixView from "./admin-views/chain-mix-view";

import TermsView from "./admin-views/terms-view";

import GenerationExamplesView from "./admin-views/generation-examples-view";

import { SignupDomainsView, WhitelistedEmailsView } from "./admin-views/access-lists-view";

const pages = {
  domains: { title: "Allowed Signup Domains", description: "Manage the domain list for signup eligibility." },
  emails: { title: "Whitelisted Emails", description: "Manage individual email addresses on the signup list." },
  examples: { title: "AI Generation Examples", description: "Create and manage example gaming situations and excuses." },
  terms: { title: "Terms", description: "Create, review, and manage your gaming glossary." },
  mix: { title: "Prompt Chain Mix", description: "Adjust how frequently each prompt chain is used for generation." },
  chains: { title: "Prompt Chains", description: "Inspect the prompt workflows used to generate excuses." },
  steps: { title: "Prompt Chain Steps", description: "Read the ordered instructions in each prompt chain." },
  providers: { title: "LLM Providers", description: "Manage the providers behind your AI models." },
  models: { title: "LLM Models", description: "Configure model identifiers and enable models for generation." },
  requests: { title: "Generation Requests", description: "Inspect generation inputs, models, and request status." },
  responses: { title: "LLM Responses", description: "Review prompts, outputs, errors, timing, and token usage." },
  stats: { title: "Stats", description: "Explore activity, game comparisons, and the most accepted excuses." },
  users: { title: "Users", description: "Review players and change user or administrator roles." },
  excuses: { title: "Excuses", description: "Create, review ratings, edit, and delete published excuses." },
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
    <div className="admin-layout">
      <a className="admin-skip-link" href="#admin-main">Skip to content</a>
      <AdminNavigation active={section} />
      <main className="admin-shell" id="admin-main" tabIndex={-1}>
      <header className="site-header">
        <span className="header-label">Administration</span>
        <div className="header-tools">
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
    </div>
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
  const View = { stats: StatsView, users: UsersView, excuses: ExcusesView, ratings: RatingsView, requests: RequestsView, responses: ResponsesView, providers: ProvidersView, models: ModelsView, chains: ChainsView, steps: ChainStepsView, mix: ChainMixView, terms: TermsView, examples: GenerationExamplesView, domains: SignupDomainsView, emails: WhitelistedEmailsView }[section];
  return <View supabase={supabase} params={params} userId={user.id} />;
}
