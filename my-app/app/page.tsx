import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "../lib/supabase/server";
import GoogleSignInButton from "./components/google-sign-in-button";
import SignOutButton from "./components/google-sign-out-button";

export default function Home() {
  return (
    <main>
      <h1>Excuse Queue Admin</h1>
      <Suspense fallback={<p>Checking login…</p>}>
        <LoginStatus />
      </Suspense>
    </main>
  );
}

async function LoginStatus() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, is_superadmin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return (
        <>
          <p>Could not verify admin permissions.</p>
          <SignOutButton />
        </>
      );
    }

    if (profile.is_superadmin !== true) {
      return (
        <>
          <p>Access denied. This account is not an administrator.</p>
          <SignOutButton />
        </>
      );
    }

    const { data: profiles, error: usersError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, is_superadmin")
      .order("first_name")
      .limit(50);

    const { data: excuses, error: excusesError } = await supabase
      .from("excuses")
      .select("id, game, character_name, situation, excuse, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const name =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      "administrator";

    return (
      <>
        <p>Welcome, {name}!</p>
        <SignOutButton />

        <h2>Users</h2>

        {usersError ? (
          <p>Could not load users.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">User ID</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((person) => (
                <tr key={person.id}>
                  <td>
                    {[person.first_name, person.last_name]
                      .filter(Boolean)
                      .join(" ") || "Unnamed user"}
                  </td>
                  <td>{person.id}</td>
                  <td>{person.is_superadmin ? "Administrator" : "User"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Latest excuses</h2>

        {excusesError ? (
          <p role="alert">Could not load excuses.</p>
        ) : !excuses?.length ? (
          <p>No excuses yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Character</th>
                <th scope="col">Situation</th>
                <th scope="col">Excuse</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {excuses.map((item) => (
                <tr key={item.id}>
                  <td>{item.game}</td>
                  <td>{item.character_name || "—"}</td>
                  <td>{item.situation || "—"}</td>
                  <td>{item.excuse}</td>
                  <td>
                    {new Date(item.created_at).toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  }

  return (
    <>
      <GoogleSignInButton />
      {error && <p>Could not verify your login. Try signing in again.</p>}
    </>
  );
}
