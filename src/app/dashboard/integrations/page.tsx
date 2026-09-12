import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Integrações" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

interface Integration {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  color: string;
  steps: string[];
  docs?: string;
  native?: boolean; // native support = just paste URL
}

const INTEGRATIONS: Integration[] = [
  {
    id: "make",
    name: "Make.com",
    emoji: "⚙️",
    category: "Automação",
    color: "#6c1fc8",
    description: "Automatize fluxos completos: crie leads no CRM, envie notificações, atualize planilhas.",
    native: true,
    steps: [
      "Crie um novo cenário no Make.com",
      'Adicione o módulo "Webhooks" → "Custom webhook"',
      "Copie a URL gerada e cole no campo Webhook URL do seu formulário",
      'Adicione os módulos seguintes (ex: Google Sheets, Gmail, HubSpot)',
      "Publique o cenário — pronto!",
    ],
    docs: "https://www.make.com/en/help/tools/webhooks",
  },
  {
    id: "zapier",
    name: "Zapier",
    emoji: "⚡",
    category: "Automação",
    color: "#ff4a00",
    description: "Conecte com mais de 5.000 aplicativos sem código.",
    native: true,
    steps: [
      'Crie um novo Zap e escolha "Webhooks by Zapier" como trigger',
      'Selecione "Catch Hook"',
      "Copie a URL do webhook e cole no formulário",
      "Teste o trigger enviando uma resposta de exemplo",
      "Configure as ações seguintes e publique o Zap",
    ],
    docs: "https://zapier.com/apps/webhook/integrations",
  },
  {
    id: "n8n",
    name: "n8n",
    emoji: "🔄",
    category: "Automação",
    color: "#ea4b71",
    description: "Automação open-source. Self-hosted ou cloud. Sem limite de execuções.",
    native: true,
    steps: [
      'Crie um novo workflow e adicione o nó "Webhook"',
      "Copie a URL do webhook gerado pelo n8n",
      "Cole no campo Webhook URL do formulário",
      "Salve e ative o workflow",
      "Adicione os nós seguintes para processar os dados",
    ],
    docs: "https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.webhook/",
  },
  {
    id: "rdstation",
    name: "RD Station",
    emoji: "🎯",
    category: "CRM / Marketing",
    color: "#00b8d9",
    description: "Envie leads direto para o RD Station Marketing e CRM.",
    native: true,
    steps: [
      "No RD Station, vá em Integrações → API",
      'Crie uma conversão via API usando o endpoint "https://www.rdstation.com/api/1.3/conversions"',
      'Use Make.com ou n8n para receber o webhook do DonForms e chamar a API do RD Station',
      "Mapeie os campos: email → email, nome → name",
      'Defina o "conversion_identifier" como nome do seu formulário',
    ],
    docs: "https://developers.rdstation.com/reference/conversions",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    emoji: "🧡",
    category: "CRM / Marketing",
    color: "#ff7a59",
    description: "Crie contatos e negócios no HubSpot a partir de cada resposta.",
    native: true,
    steps: [
      "No Make.com, crie um cenário com o webhook do DonForms como trigger",
      'Adicione o módulo "HubSpot CRM" → "Create/Update a Contact"',
      "Mapeie email → Email, nome → First Name + Last Name",
      "Adicione módulo de Deal se quiser criar negócio",
      "Publique o cenário",
    ],
    docs: "https://developers.hubspot.com/docs/api/crm/contacts",
  },
  {
    id: "clint",
    name: "Clint",
    emoji: "💼",
    category: "CRM",
    color: "#4f46e5",
    description: "CRM brasileiro. Envie leads qualificados direto para o pipeline de vendas.",
    native: true,
    steps: [
      "No Clint, vá em Configurações → API e copie sua chave",
      "No Make.com, receba o webhook do DonForms",
      'Adicione um módulo HTTP → "Make a Request"',
      "Aponte para a API do Clint (POST /leads) com os dados mapeados",
      "Os campos name, email e phone são reconhecidos automaticamente",
    ],
    docs: "https://developers.clint.com.br",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    emoji: "🔵",
    category: "CRM",
    color: "#1a3b35",
    description: "Crie pessoas e negócios no Pipedrive a cada nova resposta.",
    native: true,
    steps: [
      "No Make.com, crie cenário com webhook do DonForms como trigger",
      'Adicione módulo "Pipedrive" → "Create a Person"',
      "Mapeie nome e email dos campos do formulário",
      'Adicione "Create a Deal" e associe à pessoa recém-criada',
      "Publique e teste",
    ],
    docs: "https://developers.pipedrive.com/docs/api/v1",
  },
  {
    id: "googlesheets",
    name: "Google Sheets",
    emoji: "📊",
    category: "Planilhas",
    color: "#0f9d58",
    description: "Cada resposta vira uma linha na planilha automaticamente.",
    native: true,
    steps: [
      "No Make.com, crie cenário com webhook do DonForms como trigger",
      'Adicione módulo "Google Sheets" → "Add a Row"',
      "Selecione a planilha e mapeie as colunas para os campos do formulário",
      "Publique — cada nova resposta aparece em tempo real na planilha",
    ],
    docs: "https://www.make.com/en/help/app/google-sheets",
  },
  {
    id: "slack",
    name: "Slack",
    emoji: "💬",
    category: "Notificações",
    color: "#4a154b",
    description: "Receba uma notificação no Slack a cada nova resposta do formulário.",
    native: true,
    steps: [
      'No Slack, vá em Configurações → "Incoming Webhooks" e crie uma URL',
      "Cole essa URL no campo Webhook URL do formulário",
      "Cada resposta vai gerar uma mensagem no canal configurado",
      "Ou use Make.com para formatar melhor a mensagem antes de enviar",
    ],
    docs: "https://api.slack.com/messaging/webhooks",
  },
];

const CATEGORIES = ["Automação", "CRM / Marketing", "CRM", "Planilhas", "Notificações"];

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grouped = CATEGORIES.map(cat => ({
    label: cat,
    items: INTEGRATIONS.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  const webhookFormat = `${APP_URL}/api/forms/{form-id}/submit`;

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
          Integrações
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
          Conecte seus formulários com CRMs, automações e ferramentas de comunicação
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl px-5 py-4 space-y-3"
        style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.18)" }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 18 }}>⚡</span>
          <p className="text-sm font-semibold" style={{ color: "#a5a0ff" }}>Como funciona</p>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
          O DonForms envia um <strong style={{ color: "rgba(255,255,255,0.8)" }}>POST em JSON</strong> para qualquer URL configurada no formulário a cada nova resposta.
          Configure o webhook em <strong style={{ color: "rgba(255,255,255,0.8)" }}>Editor → Configurações → Notificações</strong>.
        </p>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: "rgba(0,0,0,0.3)", fontFamily: "monospace" }}
        >
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>URL de exemplo</span>
          <code className="text-[11px] flex-1 truncate" style={{ color: "#a5a0ff" }}>{webhookFormat}</code>
        </div>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          O payload inclui todos os campos por label + aliases (name, email, phone) + UTMs + metadados.
        </p>
      </div>

      {/* Integration cards */}
      {grouped.map(group => (
        <div key={group.label} className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            {group.label}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map(integ => (
              <IntegrationCard key={integ.id} integration={integ} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div
        className="rounded-xl px-5 py-4 text-center"
        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Não encontrou sua ferramenta?{" "}
          <span style={{ color: "rgba(255,255,255,0.6)" }}>
            Qualquer ferramenta com suporte a webhook HTTP POST funciona.
          </span>
        </p>
      </div>
    </div>
  );
}

function IntegrationCard({ integration: integ }: { integration: Integration }) {
  return (
    <div
      className="rounded-xl p-5 space-y-4 flex flex-col"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "border-color 0.15s",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${integ.color}20`, border: `1px solid ${integ.color}30` }}
        >
          {integ.emoji}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
            {integ.name}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {integ.description}
          </p>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-1.5 flex-1">
        {integ.steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-[12px]" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            <span
              className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
              style={{ background: `${integ.color}25`, color: integ.color }}
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {/* Doc link */}
      {integ.docs && (
        <a
          href={integ.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium"
          style={{ color: integ.color, textDecoration: "none" }}
        >
          Documentação →
        </a>
      )}
    </div>
  );
}
