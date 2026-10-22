"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  kind: "users" | "excuses" | "votes";
  placement?: "filters" | "pagination";
  game?: string;
  sort?: string;
  scope?: string;
  rating?: string;
  page: number;
  totalPages: number;
};

export default function AdminListControls({
  kind,
  placement = "filters",
  game = "all",
  sort = "newest",
  scope = "all",
  rating = "all",
  page,
  totalPages,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

const prefix =
  kind === "users" ? "u" : kind === "excuses" ? "e" : "v";

  function change(field: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const key = `${prefix}_${field}`;

    if (value === "all" || value === "newest" ||
        (field === "page" && value === "1")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    if (field !== "page") {
      params.delete(`${prefix}_page`);
    }

    const query = params.toString();

    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  const controls = kind === "users" ? [] : [
    {
      field: "scope",
      label: "Show",
      value: scope,
      options: [
        ["all", "Everyone"],
        ["mine", kind === "excuses" ? "My excuses" : "My votes"],
      ],
    },
    {
      field: "game",
      label: "Game",
      value: game,
      options: [
        ["all", "All games"],
        ["valorant", "Valorant"],
        ["league", "League of Legends"],
        ["overwatch", "Overwatch"],
      ],
    },
    {
      field: "sort",
      label: "Sort",
      value: sort,
      options: kind === "excuses"
        ? [
            ["newest", "Newest"],
            ["valid", "Most valid excuses"],
            ["skill", "Most skill issues"],
          ]
        : [
            ["newest", "Newest votes"],
            ["oldest", "Oldest votes"],
          ],
    },
  ];

  if (kind === "votes") {
    controls.push({
      field: "rating",
      label: "Rating",
      value: rating,
      options: [
        ["all", "All ratings"],
        ["valid", "Valid excuse"],
        ["skill", "Skill issue"],
      ],
    });
  }

  if (placement === "pagination") {
    return (
      <div className="pagination-wrap" aria-busy={pending}>
        <nav className="list-pagination" aria-label={kind + " pages"}>
          <button
            type="button"
            disabled={pending || page <= 1}
            onClick={() => change("page", String(page - 1))}
          >
            Previous
          </button>

          <span>Page {page} of {totalPages}</span>

          <button
            type="button"
            disabled={pending || page >= totalPages}
            onClick={() => change("page", String(page + 1))}
          >
            Next
          </button>
        </nav>

        <p className="list-status" role="status" aria-live="polite">
          {pending ? "Loading…" : ""}
        </p>
      </div>
    );
  }

  return (
    <div
      className="admin-list-controls"
      data-placement="filters"
      aria-busy={pending}
    >
      <fieldset className="game-filter" disabled={pending}>
        <legend className="sr-only">{kind} controls</legend>

        {controls.map((control) => (
          <label key={control.field} htmlFor={prefix + "-" + control.field}>
            {control.label}
            <select
              id={prefix + "-" + control.field}
              value={control.value}
              onChange={(event) =>
                change(control.field, event.target.value)
              }
            >
              {control.options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}

        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
        >
          Refresh
        </button>
      </fieldset>

      <p className="list-status" role="status" aria-live="polite">
        {pending ? "Loading…" : ""}
      </p>
    </div>
  );
}
