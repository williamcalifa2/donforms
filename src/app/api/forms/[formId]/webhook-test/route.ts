import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Form } from "@/types/database.types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: form, error: formError } = await client
    .from("forms")
    .select("id, title, settings, fields, user_id")
    .eq("id", formId)
    .single() as { data: Form | null; error: unknown };

  if (formError || !form) return NextResponse.json({ error: "Formulário não encontrado." }, { status: 404 });

  // Verify ownership / membership
  const isOwner = form.user_id === user.id;
  if (!isOwner) {
    const { data: membership } = await client
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", form.user_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const { webhookUrl } = req.body ? await req.json().catch(() => ({})) as { webhookUrl?: string } : {};
  const targetUrl = webhookUrl ?? form.settings.webhookUrl;
  if (!targetUrl) return NextResponse.json({ error: "Nenhuma URL de webhook configurada." }, { status: 400 });

  // Build sample payload using real field labels
  const sampleAnswers: Record<string, unknown> = {};
  for (const field of form.fields) {
    if (field.type === "statement") continue;
    const samples: Record<string, unknown> = {
      short_text: "Exemplo de resposta",
      long_text: "Resposta mais longa de exemplo para este campo.",
      email: "contato@exemplo.com.br",
      phone: "(11) 99999-9999",
      number: 42,
      date: new Date().toISOString().slice(0, 10),
      multiple_choice: field.options?.[0] ?? "Opção 1",
      yes_no: "Sim",
      rating: 5,
      file_upload: "",
    };
    sampleAnswers[field.label] = samples[field.type] ?? "Exemplo";
  }

  const payload = {
    ...sampleAnswers,
    name: "Nome Teste",
    email: "contato@exemplo.com.br",
    phone: "(11) 99999-9999",
    utm_source: "donforms-test",
    _form_id: formId,
    _form_title: form.title,
    _submitted_at: new Date().toISOString(),
    _test: true,
  };

  const t0 = Date.now();
  let statusCode: number | null = null;
  let ok = false;
  let errorMsg: string | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    statusCode = res.status;
    ok = res.ok;
    responseBody = await res.text().catch(() => null);
    if (!ok) errorMsg = `HTTP ${statusCode}`;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Network error";
  }

  const durationMs = Date.now() - t0;

  // Log the test
  await client.from("webhook_logs").insert({
    form_id: formId,
    url: targetUrl,
    status_code: statusCode,
    ok,
    error_msg: errorMsg,
    duration_ms: durationMs,
    is_test: true,
  }).catch(() => null);

  return NextResponse.json({ ok, statusCode, durationMs, errorMsg, responseBody: responseBody?.slice(0, 500) });
}
