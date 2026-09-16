"use client";

import { useState, useEffect } from "react";
import { ProjectCard } from "./ProjectCard";
import { ProjectRow } from "./ProjectRow";
import { ViewToggle } from "./ViewToggle";

const STORAGE_KEY = "donforms-view-projects";

interface Project {
  id: string;
  name: string;
  logo_url: string | null;
  formCount: number;
  clientCount: number;
}

interface Props {
  projects: Project[];
}

export function ProjectsView({ projects }: Props) {
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
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {projects.map(p => <ProjectRow key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}
