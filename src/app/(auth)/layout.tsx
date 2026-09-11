export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const Logo = () => (
    <div
      style={{
        height: 36, width: 36, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(135deg, #7c6ff7 0%, #a78bfa 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 14px rgba(124,111,247,0.45)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 p-10 text-white">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="font-semibold text-lg tracking-tight">DonForms</span>
        </div>

        <div className="space-y-4">
          <blockquote className="text-xl font-medium leading-relaxed text-zinc-100">
            &ldquo;Formulários que qualificam leads antes de chegar no comercial.&rdquo;
          </blockquote>
          <p className="text-zinc-400 text-sm">
            Capture • Qualifique • Converta
          </p>
        </div>

        <div className="flex gap-6 text-zinc-500 text-xs">
          <span>© 2026 DonForms</span>
          <a href="#" className="hover:text-zinc-300 transition-colors">Privacidade</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Termos</a>
        </div>
      </div>

      {/* Painel direito — form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Logo />
            <span className="font-semibold text-lg tracking-tight">DonForms</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
