import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Form, SubmissionMetadata } from "@/types/database.types";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  const ip = getIp(req);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    answers,
    metadata,
    _honeypot,
    _startedAt,
  }: {
    answers: Record<string, unknown>;
    metadata: SubmissionMetadata;
    _honeypot?: string;
    _startedAt?: number;
  } = body;

  // ── Anti-spam: honeypot ───────────────────────────────────────────────────
  // Bot filled the hidden field → silently discard (return 200 to avoid detection)
  if (_honeypot && _honeypot.trim() !== "") {
    console.warn(`[spam] honeypot triggered — ip=${ip} form=${formId}`);
    return NextResponse.json({ ok: true }); // fake success
  }

  // ── Anti-spam: timing (submitted in < 3 seconds = bot) ───────────────────
  if (_startedAt && Date.now() - _startedAt < 3000) {
    console.warn(`[spam] too fast — ip=${ip} form=${formId} ms=${Date.now() - _startedAt}`);
    return NextResponse.json({ ok: true }); // fake success
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // ── Buscar o form ─────────────────────────────────────────────────────────
  const { data: form, error: formError } = await client
    .from("forms")
    .select("id, title, user_id, settings, fields, is_published")
    .eq("id", formId)
    .eq("is_published", true)
    .single() as { data: Form | null; error: unknown };

  if (formError || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const settings = form.settings;

  // ── Anti-spam: rate limit via DB (persists across serverless instances) ───
  // Max 5 submissions per IP per form per hour
  if (ip !== "unknown") {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await client
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId)
      .gte("created_at", oneHourAgo)
      .filter("metadata->>ip", "eq", ip);

    if ((recentCount ?? 0) >= 5) {
      console.warn(`[spam] rate limit hit — ip=${ip} form=${formId} count=${recentCount}`);
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde um momento e tente novamente." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }
  }

  // ── Verificar limite de respostas ─────────────────────────────────────────
  if (settings.maxResponses) {
    const { count } = await client
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId);
    if ((count ?? 0) >= settings.maxResponses) {
      return NextResponse.json({ error: "Form is closed (response limit reached)" }, { status: 410 });
    }
  }

  // ── Verificar data de encerramento ────────────────────────────────────────
  if (settings.closeAt && new Date(settings.closeAt) < new Date()) {
    return NextResponse.json({ error: "Form is closed (expired)" }, { status: 410 });
  }

  // ── Inserir submissão ─────────────────────────────────────────────────────
  // IP sempre do servidor (não confiar no cliente)
  const safeMetadata = { ...metadata, ip };
  const { error: insertError } = await client
    .from("submissions")
    .insert({ form_id: formId, answers, metadata: safeMetadata });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── Email de notificação ──────────────────────────────────────────────────
  const notifEmail = settings.notificationEmail;
  const resendKey = process.env.RESEND_API_KEY;

  if (notifEmail && resendKey) {
    const fieldLines = form.fields
      .filter((f) => f.type !== "statement")
      .map((f) => {
        const val = answers[f.id];
        const display = val != null ? String(val) : "—";
        return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;">${f.label}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${display}</td></tr>`;
      })
      .join("");

    const utmLine = metadata.utm_source
      ? `<p style="margin:16px 0 0;font-size:12px;color:#999;">Origem: ${metadata.utm_source}${metadata.utm_medium ? " / " + metadata.utm_medium : ""}${metadata.utm_campaign ? " / " + metadata.utm_campaign : ""}</p>`
      : "";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "DonForms <notificacoes@donforms.vercel.app>",
        to: [notifEmail],
        subject: `Nova resposta: ${form.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="font-size:18px;margin-bottom:4px;">Nova resposta recebida</h2>
            <p style="color:#666;font-size:14px;margin-bottom:20px;">${form.title}</p>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
              ${fieldLines}
            </table>
            ${utmLine}
            <p style="margin-top:24px;font-size:12px;color:#bbb;">DonForms · Ver todas as respostas no dashboard</p>
          </div>
        `,
      }),
    }).catch(() => null); // não quebra o fluxo se email falhar
  }

  // ── Webhook ───────────────────────────────────────────────────────────────
  if (settings.webhookUrl) {
    // Monta payload flat: { "Nome": "João", "Email": "...", "Telefone": "..." }
    const labeledAnswers: Record<string, unknown> = {};
    for (const field of form.fields) {
      if (field.type !== "statement" && answers[field.id] != null) {
        labeledAnswers[field.label] = answers[field.id];
      }
    }

    // Extrai nome/email/telefone para facilitar mapeamento em CRMs
    const findByKeywords = (keywords: string[]) => {
      const entry = Object.entries(labeledAnswers).find(([k]) =>
        keywords.some(kw => k.toLowerCase().includes(kw))
      );
      return entry ? String(entry[1]) : undefined;
    };

    await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Campos flat por label — compatível com Clint e maioria dos CRMs
        ...labeledAnswers,
        // Aliases comuns para CRMs
        name: findByKeywords(["nome", "name"]),
        email: findByKeywords(["email", "e-mail"]),
        phone: findByKeywords(["telefone", "phone", "celular", "whatsapp"]),
        // Metadados
        utm_source: metadata?.utm_source,
        utm_medium: metadata?.utm_medium,
        utm_campaign: metadata?.utm_campaign,
        // Estrutura completa para debug/Make.com
        _form_id: formId,
        _form_title: form.title,
        _submitted_at: new Date().toISOString(),
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
