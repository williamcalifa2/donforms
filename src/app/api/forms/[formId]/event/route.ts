import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    // sendBeacon may send text/plain — try parsing manually
    try {
      const text = await req.text();
      body = JSON.parse(text);
    } catch { /* ignore */ }
  }
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { event_type, question_index, session_id } = body;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("form_events").insert({
    form_id: formId,
    event_type,
    question_index: question_index ?? null,
    session_id: session_id ?? null,
  });

  return NextResponse.json({ ok: true });
}
