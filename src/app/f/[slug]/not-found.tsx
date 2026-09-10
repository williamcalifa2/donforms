import Link from "next/link";

export default function FormNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-6 bg-white">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-zinc-900">404</h1>
        <p className="text-zinc-500">Este formulário não existe ou não está publicado.</p>
      </div>
      <Link
        href="/"
        className="text-sm text-indigo-600 hover:underline"
      >
        Criar meu formulário →
      </Link>
    </div>
  );
}
