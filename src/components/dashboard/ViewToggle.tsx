"use client";

import { SquaresFour, List } from "@phosphor-icons/react";

type View = "card" | "list";

interface Props {
  view: View;
  onChange: (v: View) => void;
}

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div
      className="flex items-center rounded-lg p-0.5"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)" }}
    >
      {(["card", "list"] as View[]).map((v) => {
        const active = view === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="flex items-center justify-center w-7 h-6 rounded-md transition-all"
            style={{
              background: active ? "rgba(255,255,255,0.1)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
            title={v === "card" ? "Cards" : "Lista"}
          >
            {v === "card"
              ? <SquaresFour size={13} weight={active ? "fill" : "regular"} />
              : <List size={13} weight={active ? "bold" : "regular"} />
            }
          </button>
        );
      })}
    </div>
  );
}
