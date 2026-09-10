import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-6">
      <div className="space-y-2">
        <p className="text-7xl font-bold text-zinc-200">404</p>
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">O link pode ter expirado ou nunca existiu.</p>
      </div>
      <Link href="/" className="text-sm text-primary hover:underline">
        Voltar ao início →
      </Link>
    </div>
  );
}
