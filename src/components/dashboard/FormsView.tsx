"use client";

import { useState, useEffect } from "react";
import { FormCard } from "./FormCard";
import { FormRow } from "./FormRow";
import { ViewToggle } from "./ViewToggle";
import type { FormWithCount } from "@/types/database.types";

const STORAGE_KEY = "donforms-view-forms";

interface Props {
  forms: FormWithCount[];
  appUrl: string;
  projectNames?: Record<string, string>;
}

export function FormsView({ forms, appUrl, projectNames }: Props) {
  const [view, setView] = useState<"card" | "list">("card");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "card" || saved === "list") setView(saved);
    } catch {}
  }, []);

  const handleChange = (v: "card" | "list") => {
    setView(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch {}
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex justify-end">
        <ViewToggle view={view} onChange={handleChange} />
      </div>

      {view === "card" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map(f => <FormCard key={f.id} form={f} appUrl={appUrl} projectName={f.project_id ? projectNames?.[f.project_id] : undefined} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {forms.map(f => <FormRow key={f.id} form={f} appUrl={appUrl} />)}
        </div>
      )}
    </div>
  );
}
