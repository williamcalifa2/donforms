"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "Erro inesperado. Tente novamente."}
        </p>
      </div>
      <button
        onClick={reset}
        className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Tentar novamente
      </button>
    </div>
  );
}
