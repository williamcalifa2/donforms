import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Criar conta" };

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function SignupPage({ searchParams }: Props) {
  const { error, success } = await searchParams;

  if (success) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Verifique seu email
          </h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação.
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
          <p className="font-medium mb-1">✓ Email enviado!</p>
          <p>{decodeURIComponent(success)}</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Já confirmou?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={signUp} className="space-y-4">
        <Input
          label="Nome"
          name="name"
          type="text"
          placeholder="Seu nome"
          autoComplete="name"
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="voce@exemplo.com"
          autoComplete="email"
          required
        />

        <Input
          label="Senha"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <Button type="submit" size="lg" className="w-full">
          Criar conta grátis
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        Ao criar, você concorda com nossos{" "}
        <a href="#" className="underline hover:text-foreground">
          Termos de Uso
        </a>
        .
      </p>
    </div>
  );
}
