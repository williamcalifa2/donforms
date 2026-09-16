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
      className="flex items-center rounded-lg p-0.5 gap-0.5"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.08))", border: "1px solid var(--card-border, rgba(255,255,255,0.12))" }}
    >
      {(["card", "list"] as View[]).map((v) => {
        const active = view === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="flex items-center justify-center w-8 h-7 rounded-md transition-all"
            style={{
              background: active ? "rgba(255,255,255,0.15)" : "transparent",
              color: active ? "var(--text-primary, #fff)" : "var(--text-tertiary, rgba(255,255,255,0.4))",
            }}
            title={v === "card" ? "Cards" : "Lista"}
          >
            {v === "card"
              ? <SquaresFour size={15} weight={active ? "fill" : "regular"} />
              : <List size={15} weight={active ? "bold" : "regular"} />
            }
          </button>
        );
      })}
    </div>
  );
}
