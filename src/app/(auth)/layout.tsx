export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 p-10 text-white">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <span className="font-semibold text-lg">DonForms</span>
        </div>

        <div className="space-y-4">
          <blockquote className="text-xl font-medium leading-relaxed text-zinc-100">
            &ldquo;A melhor ferramenta para criar formulários que as pessoas realmente respondem.&rdquo;
          </blockquote>
          <p className="text-zinc-400 text-sm">
            Conversacional • Personalizado • Alta conversão
          </p>
        </div>

        <div className="flex gap-6 text-zinc-500 text-xs">
          <span>© 2025 DonForms</span>
          <a href="#" className="hover:text-zinc-300 transition-colors">Privacidade</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Termos</a>
        </div>
      </div>

      {/* Painel direito — form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <span className="font-semibold text-lg">DonForms</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
