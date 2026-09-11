import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Form, FormEvent } from "@/types/database.types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: form, error } = await client
    .from("forms")
    .select("id, title, fields, is_published, settings")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as { data: Form | null; error: unknown };

  if (error || !form) notFound();

  const { data: events } = await client
    .from("form_events")
    .select("*")
    .eq("form_id", id) as { data: FormEvent[] | null };

  const { data: submissions } = await client
    .from("submissions")
    .select("id, metadata")
    .eq("form_id", id) as { data: { id: string; metadata: Record<string, string> | null }[] | null };

  const evs = events ?? [];
  const views = evs.filter(e => e.event_type === "view").length;
  const starts = evs.filter(e => e.event_type === "start").length;
  const completes = evs.filter(e => e.event_type === "complete").length;
  const abandons = evs.filter(e => e.event_type === "abandon");
  const totalSubs = submissions?.length ?? 0;

  const startRate = views > 0 ? Math.round((starts / views) * 100) : 0;
  const completionRate = starts > 0 ? Math.round((completes / starts) * 100) : 0;

  // Drop-off por pergunta
  const inputFields = form.fields.filter(f => f.type !== "statement");
  const dropOff = inputFields.map((field, i) => ({
    label: field.label,
    index: i,
    abandonCount: abandons.filter(e => (e.question_index ?? 0) === i).length,
  }));

  const maxDropOff = Math.max(...dropOff.map(d => d.abandonCount), 1);

  // UTM breakdown — qual param usar
  const utmParam = (form.settings as { utmDisplayParam?: string | null }).utmDisplayParam ?? "utm_source";
  const utmCounts: Record<string, number> = {};
  for (const sub of submissions ?? []) {
    const val = sub.metadata?.[utmParam];
    if (val) utmCounts[val] = (utmCounts[val] ?? 0) + 1;
  }
  const utmBreakdown = Object.entries(utmCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxUtm = Math.max(...utmBreakdown.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">← Voltar</Link>
          <div>
            <h1 className="text-xl font-semibold">{form.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Analytics de conversão</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/forms/${id}/responses`}
            className="text-sm border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors text-muted-foreground">
            Ver respostas
          </Link>
          <Link href={`/dashboard/forms/${id}/edit`}
            className="text-sm border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors text-muted-foreground">
            Editar
          </Link>
        </div>
      </div>

      {/* Funil principal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Visualizações", value: views, sub: "total de views", color: "text-blue-600" },
          { label: "Iniciaram", value: starts, sub: `${startRate}% dos views`, color: "text-indigo-600" },
          { label: "Concluíram", value: completes, sub: `${completionRate}% dos inícios`, color: "text-green-600" },
          { label: "Respostas salvas", value: totalSubs, sub: "no banco de dados", color: "text-purple-600" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="border rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Barra de funil visual */}
      <div className="border rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium">Funil de conversão</p>
        {[
          { label: "Views", count: views, color: "bg-blue-500" },
          { label: "Inícios", count: starts, color: "bg-indigo-500" },
          { label: "Conclusões", count: completes, color: "bg-green-500" },
        ].map(({ label, count, color }) => {
          const pct = views > 0 ? Math.round((count / views) * 100) : 0;
          return (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-medium tabular-nums w-12 text-right">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
            </div>
          );
        })}
      </div>

      {/* Drop-off por pergunta */}
      {dropOff.length > 0 && (
        <div className="border rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium">Drop-off por pergunta</p>
          <p className="text-xs text-muted-foreground -mt-2">Em qual pergunta os respondentes abandonam mais</p>
          {dropOff.map(({ label, index, abandonCount }) => {
            const pct = maxDropOff > 0 ? Math.round((abandonCount / maxDropOff) * 100) : 0;
            return (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">{index + 1}</span>
                <span className="text-xs truncate w-40 shrink-0">{label}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">{abandonCount} saíram</span>
              </div>
            );
          })}
        </div>
      )}

      {/* UTM Breakdown */}
      {utmBreakdown.length > 0 && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
              Origem dos leads
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
              {utmParam}
            </span>
          </div>
          <div className="space-y-2.5">
            {utmBreakdown.map(([val, count]) => {
              const pct = Math.round((count / maxUtm) * 100);
              return (
                <div key={val} className="flex items-center gap-3">
                  <span className="text-xs font-mono truncate w-36 shrink-0" style={{ color: "rgba(255,255,255,0.7)" }}>{val}</span>
                  <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "hsl(238 100% 74%)" }} />
                  </div>
                  <span className="text-xs tabular-nums w-8 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {views === 0 && (
        <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
          <p className="text-sm font-medium">Sem dados ainda</p>
          <p className="text-xs max-w-xs">
            {form.is_published
              ? "Compartilhe o link do formulário. Os dados aparecem em tempo real."
              : "Publique o formulário para começar a coletar dados."}
          </p>
        </div>
      )}
    </div>
  );
}
