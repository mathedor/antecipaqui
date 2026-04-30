"use client";

import { useState } from "react";
import { CtaCadastro } from "@/components/cta-buttons";

const groups = [
  {
    title: "Como funciona",
    questions: [
      {
        q: "O que exatamente é antecipação de comissão?",
        a: "É a compra antecipada do direito de receber sua comissão futura. Você cede pra Antecipaqui a comissão parcelada que tem a receber, e em troca recebe o valor presente (com deságio) à vista.",
      },
      {
        q: "Em quanto tempo o dinheiro cai na conta?",
        a: "Após aprovação técnica + assinatura digital do contrato, em até 1 dia útil. Da abertura da operação até o crédito, tipicamente 24-48h.",
      },
      {
        q: "Qual a taxa cobrada?",
        a: "A taxa média é de 6% ao mês, aplicada como deságio no valor presente. O valor exato pode variar conforme análise de crédito da operação. Você sempre vê o valor líquido antes de aceitar.",
      },
      {
        q: "Posso simular antes de me cadastrar?",
        a: "Pode. O simulador da página inicial é livre, sem cadastro. Arraste os controles pra ver cenários reais.",
      },
    ],
  },
  {
    title: "Cadastro e documentação",
    questions: [
      {
        q: "Quem pode se cadastrar?",
        a: "Corretores autônomos com CRECI, imobiliárias com CNPJ ativo, e construtoras pessoa jurídica. Pessoas físicas sem CRECI ou CNPJ não atendem por enquanto.",
      },
      {
        q: "Quais documentos preciso enviar?",
        a: "CNPJ ativo, contrato social ou CRECI (corretor PF), comprovante de endereço da empresa, RG/CPF dos sócios, e dados bancários pra recebimento. Tudo em PDF, upload pelo painel.",
      },
      {
        q: "Quanto tempo leva pra ser aprovado?",
        a: "Validação documental em até 24h úteis após o envio. Você recebe email de confirmação assim que o cadastro está ativo.",
      },
    ],
  },
  {
    title: "Operação e segurança",
    questions: [
      {
        q: "E se a construtora não pagar?",
        a: "A operação é estruturada com cessão de crédito formalizada e assinada por todas as partes (corretor + construtora). Se a construtora não honrar, atuamos com cobrança jurídica direta — você não tem responsabilidade pelo inadimplemento.",
      },
      {
        q: "Os documentos ficam seguros?",
        a: "Sim. Armazenamos tudo com criptografia AES-256 em servidores certificados. Acesso restrito só às partes envolvidas em cada operação.",
      },
      {
        q: "Como funciona a assinatura do contrato?",
        a: "Geramos o contrato de cessão automaticamente após aprovação. Enviamos pra assinatura digital com validade jurídica (ICP-Brasil). Cada parte assina pelo email/celular.",
      },
      {
        q: "Posso antecipar parcialmente uma comissão?",
        a: "Sim. Você escolhe quais parcelas antecipa — todas ou só algumas. O cálculo do valor presente reflete só as parcelas antecipadas.",
      },
    ],
  },
  {
    title: "Para construtoras",
    questions: [
      {
        q: "Tenho custo se aceitar essa parceria?",
        a: "Zero custo direto. O deságio é cobrado do corretor que antecipou. Pra construtora, é só um parceiro no meio que recebe no lugar do corretor.",
      },
      {
        q: "Muda algo no meu fluxo de pagamento?",
        a: "Nada. Você paga conforme negociado com o corretor — apenas a destinação do pagamento muda (vai pra Antecipaqui em vez do corretor). Datas e valores idênticos.",
      },
      {
        q: "Por que minha construtora deveria entrar?",
        a: "Corretor que recebe à vista é corretor mais motivado, vende mais e foca no negócio. Você ganha vendas sem custar nada — basicamente um benefício pro seu time comercial.",
      },
    ],
  },
];

export default function PerguntasPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" aria-hidden />
        <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-24 pb-16 relative">
          <div className="eyebrow fade-up mb-5">perguntas frequentes</div>
          <h1 className="max-w-4xl text-display-xl">
            Perguntas{" "}
            <span className="text-gradient-blue">esperadas</span>.
          </h1>
          <p className="fade-up mt-6 max-w-2xl text-fg-muted text-lg md:text-xl leading-relaxed">
            Coletamos as dúvidas mais comuns de corretores, imobiliárias e
            construtoras. Não achou a sua? Manda pelo WhatsApp.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20 space-y-12">
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
              {g.title}
            </h2>
            <div className="space-y-3">
              {g.questions.map((qa) => (
                <FaqItem key={qa.q} q={qa.q} a={qa.a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-border bg-bg-card p-10 md:p-14 text-center">
          <h2 className="text-display-md max-w-2xl mx-auto">
            Não achou sua dúvida?
          </h2>
          <p className="mt-4 text-fg-muted text-lg">
            Conta pra gente pelo WhatsApp ou comece um cadastro — explicamos
            durante o processo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CtaCadastro className="btn-primary">
              Cadastre-se <span className="arrow">→</span>
            </CtaCadastro>
          </div>
        </div>
      </section>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="group rounded-2xl border border-border bg-bg-elev hover:border-accent/50 transition-colors"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        className="cursor-pointer list-none p-5 md:p-6 flex items-center justify-between gap-4"
      >
        <span className="text-base md:text-lg font-medium text-fg pr-4">{q}</span>
        <span
          className="size-8 shrink-0 rounded-full bg-bg-card flex items-center justify-center text-fg-muted transition-transform"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0)" }}
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="px-5 md:px-6 pb-5 md:pb-6 text-fg-muted leading-relaxed">
        {a}
      </div>
    </details>
  );
}
