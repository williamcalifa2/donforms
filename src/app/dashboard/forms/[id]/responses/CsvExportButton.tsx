"use client";

import type { Form, Submission } from "@/types/database.types";

interface Props {
  form: Form;
  submissions: Submission[];
}

export function CsvExportButton({ form, submissions }: Props) {
  const exportCsv = () => {
    const inputFields = form.fields.filter(f => f.type !== "statement");

    const headers = [
      "Data",
      ...inputFields.map(f => f.label),
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "UTM Term",
      "UTM Content",
      "Referrer",
    ];

    const rows = submissions.map(sub => {
      const answers = inputFields.map(f => {
        const val = sub.answers[f.id];
        if (val == null) return "";
        if (Array.isArray(val)) return val.join("; ");
        return String(val).replace(/"/g, '""');
      });
      return [
        new Date(sub.created_at).toLocaleString("pt-BR"),
        ...answers,
        sub.metadata?.utm_source ?? "",
        sub.metadata?.utm_medium ?? "",
        sub.metadata?.utm_campaign ?? "",
        sub.metadata?.utm_term ?? "",
        sub.metadata?.utm_content ?? "",
        sub.metadata?.referrer ?? "",
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title.replace(/[^a-z0-9]/gi, "_")}_respostas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportCsv}
      className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="h-3.5 w-3.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Exportar CSV
    </button>
  );
}
