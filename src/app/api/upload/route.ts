import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file      = formData.get("file")      as File   | null;
    const formId    = formData.get("formId")    as string | null;
    const fieldId   = formData.get("fieldId")   as string | null;
    const maxSizeMb = parseInt((formData.get("maxSizeMb") as string) || "10", 10);
    const accept    = (formData.get("accept") as string) || "*";

    if (!file)    return NextResponse.json({ error: "Arquivo não enviado."   }, { status: 400 });
    if (!formId)  return NextResponse.json({ error: "formId obrigatório."    }, { status: 400 });
    if (!fieldId) return NextResponse.json({ error: "fieldId obrigatório."   }, { status: 400 });

    // ── Validate size ──────────────────────────────────────────────────────────
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo: ${maxSizeMb}MB` },
        { status: 413 }
      );
    }

    // ── Validate type (basic) ──────────────────────────────────────────────────
    if (accept !== "*") {
      const allowed = accept.split(",").map(a => a.trim());
      const ok = allowed.some(pattern => {
        if (pattern.endsWith("/*")) return file.type.startsWith(pattern.slice(0, -2));
        if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
        return file.type === pattern;
      });
      if (!ok) {
        return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 415 });
      }
    }

    // ── Upload to Supabase Storage ─────────────────────────────────────────────
    const supabase = await createClient();
    const ext  = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${formId}/${fieldId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("form-uploads")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[upload] Supabase storage error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("form-uploads")
      .getPublicUrl(path);

    return NextResponse.json({
      url:  publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    console.error("[upload] Unexpected error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
