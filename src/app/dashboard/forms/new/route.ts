import { createForm } from "@/app/actions/forms";

// GET /dashboard/forms/new → cria form e redireciona para o editor
export async function GET() {
  return createForm();
}
