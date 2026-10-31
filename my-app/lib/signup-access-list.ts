export type AccessListKind = "domain" | "email";
export type AccessListRecord = { id: number; value: string; notes: string | null };
export const accessLists = {
  domain: { table: "allowed_signup_domains", column: "domain", path: "/signup-domains", label: "domain", title: "Allowed signup domains" },
  email: { table: "whitelist_email_addresses", column: "email_address", path: "/whitelisted-emails", label: "email address", title: "Whitelisted emails" },
} as const;

export function validDomain(value: string) {
  const parts = value.split(".");
  return value.length <= 253 && parts.length >= 2 && !/^\d+$/.test(parts[parts.length - 1]) &&
    parts.every(part => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part));
}

export function validEmail(value: string) {
  if (value.length > 254) return false;
  const parts = value.split("@");
  if (parts.length !== 2 || parts[0].length > 64 || !validDomain(parts[1])) return false;
  return /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(parts[0]);
}
