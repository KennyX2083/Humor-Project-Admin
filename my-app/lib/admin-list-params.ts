import { redirect } from "next/navigation";
import type { AdminSearchParams } from "./admin-page-types";

export function listParams(params: AdminSearchParams, pathname: string) {
  function pick(key: string, allowed: string[], fallback: string) {
    const value = params[key];
    return typeof value === "string" && allowed.includes(value) ? value : fallback;
  }

  function readPage(key: string) {
    const value = params[key];
    const number = Number(typeof value === "string" ? value : "1");
    return Number.isSafeInteger(number) && number >= 1 && number <= 2147483647 ? number : 1;
  }

  function resetPage(prefix: "u" | "e" | "v") {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === `${prefix}_page`) continue;
      if (typeof value === "string") next.set(key, value);
      else if (Array.isArray(value)) value.forEach((entry) => next.append(key, entry));
    }
    const query = next.toString();
    redirect(query ? `${pathname}?${query}` : pathname);
  }

  return { pick, readPage, resetPage };
}
