export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const Logo = () => (
    <div
      style={{
        height: 36, width: 36, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(135deg, hsl(233 100% 81%) 0%, hsl(231 57% 67%) 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 14px hsl(233 100% 81% / .35)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z" />
      </svg>
    </div>
  );

  return (
    <div className="dark min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 text-white relative overflow-hidden"
        style={{ background: "hsl(230 35% 7%)" }}
      >
        {/* Gradient accent strip at top */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(135deg, hsl(233 100% 81%) 0%, hsl(231 57% 67%) 100%)",
        }} />

        {/* Background radial glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 20% 40%, hsl(233 100% 81% / .08) 0%, transparent 60%)",
        }} />

        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }} />

        <div className="relative flex items-center gap-3">
          <Logo />
          <span className="font-semibold text-lg tracking-tight">DonForms</span>
        </div>

        <div className="relative space-y-4">
          <blockquote
            className="text-xl font-medium leading-relaxed"
            style={{ color: "hsl(220 23% 95%)" }}
          >
            &ldquo;Formulários que qualificam leads antes de chegar no comercial.&rdquo;
          </blockquote>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: 14 }}>
            Capture • Qualifique • Converta
          </p>
        </div>

        <div className="relative flex gap-6 text-xs" style={{ color: "hsl(220 15% 40%)" }}>
          <span>© 2026 DonForms</span>
          <a href="#" style={{ color: "inherit" }} className="hover:text-white transition-colors">Privacidade</a>
          <a href="#" style={{ color: "inherit" }} className="hover:text-white transition-colors">Termos</a>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="flex items-center justify-center p-6"
        style={{ background: "hsl(230 35% 7%)" }}
      >
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Logo />
            <span className="font-semibold text-lg tracking-tight text-white">DonForms</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
