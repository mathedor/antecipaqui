"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createFundoAction, type FundoState } from "@/lib/actions/fundos";
import { lookupCnpj } from "@/lib/actions/corretor-velocidade";
import { buscarCep } from "@/lib/cep";
import { maskCEP, maskCNPJ, maskPhone } from "@/lib/cnpj";
import { useFeedback } from "@/components/feedback-provider";

type FormState = {
  // Step 1
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  contatoResponsavel: string;
  telefone: string;
  emailComercial: string;
  emailAssinatura: string;
  // Step 2
  cep: string;
  endereco: string;
  cidade: string;
  uf: string;
  // Step 3
  taxaMensalBase: string;
  custoFinanceiroPct: string;
  impostosPct: string;
  // Step 4
  bancoNome: string;
  bancoCodigo: string;
  bancoAgencia: string;
  bancoConta: string;
  bancoPix: string;
  // Step 5
  boletosModo: "manual" | "api" | "cnab";
  multaAtrasoPct: string;
  jurosMoraMensalPct: string;
  // API config
  cobrancaApiUrl: string;
  // CNAB config
  cnabBancoCodigo: string;
  cnabCarteira: string;
  cnabConvenio: string;
  cnabCedenteCodigo: string;
};

const INITIAL: FormState = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  contatoResponsavel: "",
  telefone: "",
  emailComercial: "",
  emailAssinatura: "",
  cep: "",
  endereco: "",
  cidade: "",
  uf: "",
  taxaMensalBase: "6,00",
  custoFinanceiroPct: "1,50",
  impostosPct: "5,00",
  bancoNome: "",
  bancoCodigo: "",
  bancoAgencia: "",
  bancoConta: "",
  bancoPix: "",
  boletosModo: "manual",
  multaAtrasoPct: "2,00",
  jurosMoraMensalPct: "1,00",
  cobrancaApiUrl: "",
  cnabBancoCodigo: "",
  cnabCarteira: "",
  cnabConvenio: "",
  cnabCedenteCodigo: "",
};

const STEPS = [
  { id: 1, label: "Identificação" },
  { id: 2, label: "Endereço" },
  { id: 3, label: "Custos" },
  { id: 4, label: "Conta bancária" },
  { id: 5, label: "Cobrança & encargos" },
  { id: 6, label: "Revisão" },
] as const;

export function FundoOnboardingWizard() {
  const router = useRouter();
  const { alertError, alertSuccess } = useFeedback();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(INITIAL);
  const [erros, setErros] = useState<string[]>([]);
  const [pendingCnpj, startCnpj] = useTransition();
  const [pendingCep, startCep] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  function up<K extends keyof FormState>(k: K, v: FormState[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function lookupCnpjNow() {
    if (data.cnpj.replace(/\D/g, "").length !== 14) return;
    startCnpj(async () => {
      const r = await lookupCnpj(data.cnpj);
      if (!r.ok) {
        await alertError(r.error, "CNPJ não localizado");
        return;
      }
      const d = r.data;
      setData((prev) => ({
        ...prev,
        razaoSocial: prev.razaoSocial || d.razao_social,
        nomeFantasia: prev.nomeFantasia || d.nome_fantasia || "",
        cep: prev.cep || (d.cep ? maskCEP(d.cep) : ""),
        endereco: prev.endereco || d.logradouro || "",
        cidade: prev.cidade || d.municipio || "",
        uf: prev.uf || d.uf || "",
        telefone:
          prev.telefone ||
          (d.ddd_telefone_1 ? maskPhone(d.ddd_telefone_1) : ""),
        emailComercial: prev.emailComercial || d.email || "",
      }));
      await alertSuccess("Dados preenchidos automaticamente.", "Pronto");
    });
  }

  function lookupCepNow() {
    const clean = data.cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    startCep(async () => {
      const r = await buscarCep(data.cep);
      if (!r) {
        await alertError("CEP não encontrado.");
        return;
      }
      setData((prev) => ({
        ...prev,
        endereco: r.logradouro || prev.endereco,
        cidade: r.cidade || prev.cidade,
        uf: r.uf || prev.uf,
      }));
    });
  }

  function validate(s: number): string[] {
    const e: string[] = [];
    if (s === 1) {
      if (data.cnpj.replace(/\D/g, "").length !== 14) e.push("CNPJ inválido");
      if (!data.razaoSocial) e.push("Razão social é obrigatória");
      if (!data.emailComercial.includes("@"))
        e.push("Email comercial inválido");
      if (!data.emailAssinatura.includes("@"))
        e.push("Email para assinatura inválido");
    }
    if (s === 3) {
      const t = parseFloat(data.taxaMensalBase.replace(",", "."));
      if (!Number.isFinite(t) || t <= 0)
        e.push("Taxa mensal base inválida");
    }
    if (s === 5) {
      if (data.boletosModo === "api" && !data.cobrancaApiUrl)
        e.push("Informe a URL da API de cobrança");
      if (data.boletosModo === "cnab") {
        if (!data.cnabBancoCodigo) e.push("Código do banco CNAB obrigatório");
        if (!data.cnabCarteira) e.push("Carteira CNAB obrigatória");
        if (!data.cnabConvenio) e.push("Convênio CNAB obrigatório");
        if (!data.cnabCedenteCodigo)
          e.push("Código cedente CNAB obrigatório");
      }
    }
    return e;
  }

  function next() {
    const e = validate(step);
    if (e.length > 0) {
      setErros(e);
      return;
    }
    setErros([]);
    setStep(step + 1);
  }

  function prev() {
    setErros([]);
    setStep(step - 1);
  }

  async function submit() {
    setSubmitting(true);
    setErros([]);
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v != null) fd.append(k, String(v));
    });
    try {
      const r: FundoState = await createFundoAction(null, fd);
      if (r?.ok) {
        await alertSuccess("Fundo cadastrado com sucesso.", "Pronto");
        router.push(`/admin/fundos/${r.fundoId}`);
      } else if (r) {
        setErros([r.error]);
      }
    } catch (e) {
      setErros([(e as Error).message]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header de progresso */}
      <ol className="grid grid-cols-2 md:grid-cols-6 gap-1.5">
        {STEPS.map((s) => {
          const ativo = step === s.id;
          const feito = step > s.id;
          return (
            <li
              key={s.id}
              className={`rounded-lg border p-2.5 text-[10px] uppercase tracking-wider font-mono transition ${
                ativo
                  ? "border-accent bg-accent text-white"
                  : feito
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-bg-card text-fg-dim"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold">
                  {feito ? "✓" : s.id}
                </span>
                <span className="truncate">{s.label}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Errors */}
      {erros.length > 0 && (
        <div className="rounded-xl border border-danger/40 bg-red-50 p-3 text-danger text-xs space-y-1">
          {erros.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}

      {/* Step content */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-7 space-y-4">
        {step === 1 && (
          <Step1
            data={data}
            up={up}
            onLookupCnpj={lookupCnpjNow}
            pendingCnpj={pendingCnpj}
          />
        )}
        {step === 2 && (
          <Step2
            data={data}
            up={up}
            onLookupCep={lookupCepNow}
            pendingCep={pendingCep}
          />
        )}
        {step === 3 && <Step3 data={data} up={up} />}
        {step === 4 && <Step4 data={data} up={up} />}
        {step === 5 && <Step5 data={data} up={up} />}
        {step === 6 && <Step6 data={data} />}
      </section>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/fundos"
          className="text-xs text-fg-muted hover:text-fg"
        >
          ← Cancelar
        </Link>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={prev}
              className="h-10 px-4 rounded-lg border border-border text-sm hover:border-accent"
            >
              Voltar
            </button>
          )}
          {step < STEPS.length ? (
            <button
              type="button"
              onClick={next}
              className="h-10 px-5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
            >
              Próximo →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="h-10 px-5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
            >
              {submitting ? "Salvando..." : "Criar fundo ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   STEPS
   =========================================================== */

type StepProps = {
  data: FormState;
  up: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
};

function Step1({
  data,
  up,
  onLookupCnpj,
  pendingCnpj,
}: StepProps & {
  onLookupCnpj: () => void;
  pendingCnpj: boolean;
}) {
  return (
    <>
      <Header
        title="Quem é o fundo?"
        sub="Cole o CNPJ e a gente busca os dados na Receita Federal automaticamente."
      />
      <div className="space-y-3">
        <div>
          <Label>CNPJ *</Label>
          <div className="flex gap-2">
            <input
              className="form-input flex-1"
              value={data.cnpj}
              onChange={(e) => up("cnpj", maskCNPJ(e.target.value))}
              onBlur={onLookupCnpj}
              placeholder="00.000.000/0000-00"
            />
            <button
              type="button"
              onClick={onLookupCnpj}
              disabled={pendingCnpj || data.cnpj.replace(/\D/g, "").length !== 14}
              className="h-10 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent disabled:opacity-50"
            >
              {pendingCnpj ? "..." : "Buscar"}
            </button>
          </div>
          <p className="text-[11px] text-fg-dim mt-1">
            Buscamos razão social, endereço, telefone e email automaticamente.
          </p>
        </div>
        <Grid2>
          <div>
            <Label>Razão social *</Label>
            <input
              className="form-input"
              value={data.razaoSocial}
              onChange={(e) => up("razaoSocial", e.target.value)}
            />
          </div>
          <div>
            <Label>Nome fantasia</Label>
            <input
              className="form-input"
              value={data.nomeFantasia}
              onChange={(e) => up("nomeFantasia", e.target.value)}
            />
          </div>
        </Grid2>
        <Grid2>
          <div>
            <Label>Contato responsável</Label>
            <input
              className="form-input"
              value={data.contatoResponsavel}
              onChange={(e) => up("contatoResponsavel", e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <input
              className="form-input"
              value={data.telefone}
              onChange={(e) => up("telefone", maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </Grid2>
        <Grid2>
          <div>
            <Label>Email comercial *</Label>
            <input
              className="form-input"
              type="email"
              value={data.emailComercial}
              onChange={(e) => up("emailComercial", e.target.value)}
              placeholder="comercial@fundo.com.br"
            />
          </div>
          <div>
            <Label>Email para assinatura *</Label>
            <input
              className="form-input"
              type="email"
              value={data.emailAssinatura}
              onChange={(e) => up("emailAssinatura", e.target.value)}
              placeholder="juridico@fundo.com.br"
            />
            <p className="text-[11px] text-fg-dim mt-1">
              Recebe contratos e termos pra assinar via ZapSign.
            </p>
          </div>
        </Grid2>
      </div>
    </>
  );
}

function Step2({
  data,
  up,
  onLookupCep,
  pendingCep,
}: StepProps & {
  onLookupCep: () => void;
  pendingCep: boolean;
}) {
  return (
    <>
      <Header
        title="Endereço da sede"
        sub="Usado em contratos e borderôs. Cola o CEP e a gente preenche."
      />
      <div className="space-y-3">
        <Grid2>
          <div>
            <Label>CEP</Label>
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                value={data.cep}
                onChange={(e) => up("cep", maskCEP(e.target.value))}
                onBlur={onLookupCep}
                placeholder="00000-000"
              />
              <button
                type="button"
                onClick={onLookupCep}
                disabled={
                  pendingCep || data.cep.replace(/\D/g, "").length !== 8
                }
                className="h-10 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent disabled:opacity-50"
              >
                {pendingCep ? "..." : "Buscar"}
              </button>
            </div>
          </div>
          <div>
            <Label>UF</Label>
            <input
              className="form-input uppercase"
              value={data.uf}
              maxLength={2}
              onChange={(e) => up("uf", e.target.value.toUpperCase())}
              placeholder="SP"
            />
          </div>
        </Grid2>
        <div>
          <Label>Endereço</Label>
          <input
            className="form-input"
            value={data.endereco}
            onChange={(e) => up("endereco", e.target.value)}
            placeholder="Rua, número, complemento"
          />
        </div>
        <div>
          <Label>Cidade</Label>
          <input
            className="form-input"
            value={data.cidade}
            onChange={(e) => up("cidade", e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function Step3({ data, up }: StepProps) {
  return (
    <>
      <Header
        title="Custos e taxas"
        sub="Defina a taxa base de juros e os custos do fundo. Tudo em % ao mês."
      />
      <div className="space-y-3">
        <div>
          <Label>Taxa mensal base * (%)</Label>
          <input
            className="form-input"
            value={data.taxaMensalBase}
            onChange={(e) => up("taxaMensalBase", e.target.value)}
            placeholder="6,00"
            inputMode="decimal"
          />
          <p className="text-[11px] text-fg-dim mt-1">
            Taxa mínima que o fundo cobra ao mês. Ex: 6 = 6% a.m.
          </p>
        </div>
        <Grid2>
          <div>
            <Label>Custo financeiro/rateio (%)</Label>
            <input
              className="form-input"
              value={data.custoFinanceiroPct}
              onChange={(e) => up("custoFinanceiroPct", e.target.value)}
              placeholder="1,50"
              inputMode="decimal"
            />
          </div>
          <div>
            <Label>Impostos (%)</Label>
            <input
              className="form-input"
              value={data.impostosPct}
              onChange={(e) => up("impostosPct", e.target.value)}
              placeholder="5,00"
              inputMode="decimal"
            />
          </div>
        </Grid2>
      </div>
    </>
  );
}

function Step4({ data, up }: StepProps) {
  return (
    <>
      <Header
        title="Conta bancária"
        sub="Onde o fundo recebe os repasses. Pode preencher só com PIX se preferir."
      />
      <div className="space-y-3">
        <Grid2>
          <div>
            <Label>Banco</Label>
            <input
              className="form-input"
              value={data.bancoNome}
              onChange={(e) => up("bancoNome", e.target.value)}
              placeholder="Itaú, BB, Santander..."
            />
          </div>
          <div>
            <Label>Código do banco</Label>
            <input
              className="form-input"
              value={data.bancoCodigo}
              onChange={(e) => up("bancoCodigo", e.target.value)}
              placeholder="341, 001..."
            />
          </div>
        </Grid2>
        <Grid2>
          <div>
            <Label>Agência</Label>
            <input
              className="form-input"
              value={data.bancoAgencia}
              onChange={(e) => up("bancoAgencia", e.target.value)}
              placeholder="0001"
            />
          </div>
          <div>
            <Label>Conta</Label>
            <input
              className="form-input"
              value={data.bancoConta}
              onChange={(e) => up("bancoConta", e.target.value)}
              placeholder="000000-0"
            />
          </div>
        </Grid2>
        <div>
          <Label>Chave PIX</Label>
          <input
            className="form-input"
            value={data.bancoPix}
            onChange={(e) => up("bancoPix", e.target.value)}
            placeholder="CNPJ, email ou aleatória"
          />
        </div>
      </div>
    </>
  );
}

function Step5({ data, up }: StepProps) {
  return (
    <>
      <Header
        title="Como o fundo emite boletos?"
        sub="Define o modo de cobrança. Pode trocar depois nas configurações do fundo."
      />
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-2">
          {(["manual", "cnab", "api"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => up("boletosModo", mode)}
              className={`rounded-xl border p-4 text-left transition ${
                data.boletosModo === mode
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-bg hover:border-fg-muted"
              }`}
            >
              <div className="font-bold text-sm capitalize">
                {mode === "manual"
                  ? "🪪 Manual"
                  : mode === "cnab"
                    ? "📄 CNAB"
                    : "🔌 API"}
              </div>
              <div className="text-[11px] text-fg-muted mt-1">
                {mode === "manual"
                  ? "Admin emite no banco do fundo manualmente"
                  : mode === "cnab"
                    ? "Gera arquivo de remessa pra subir no banco"
                    : "Integração direta com API do banco"}
              </div>
            </button>
          ))}
        </div>

        {data.boletosModo === "api" && (
          <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3 space-y-2">
            <Label>URL da API de cobrança</Label>
            <input
              className="form-input"
              value={data.cobrancaApiUrl}
              onChange={(e) => up("cobrancaApiUrl", e.target.value)}
              placeholder="https://api.banco.com/v1/cobrancas"
            />
            <p className="text-[11px] text-fg-dim">
              Credenciais e auth podem ser ajustados depois em /admin/fundos/[id]/editar.
            </p>
          </div>
        )}

        {data.boletosModo === "cnab" && (
          <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3 space-y-2">
            <Grid2>
              <div>
                <Label>Código do banco</Label>
                <input
                  className="form-input"
                  value={data.cnabBancoCodigo}
                  onChange={(e) => up("cnabBancoCodigo", e.target.value)}
                  placeholder="341, 001, 033..."
                />
              </div>
              <div>
                <Label>Carteira</Label>
                <input
                  className="form-input"
                  value={data.cnabCarteira}
                  onChange={(e) => up("cnabCarteira", e.target.value)}
                  placeholder="109, 17..."
                />
              </div>
            </Grid2>
            <Grid2>
              <div>
                <Label>Convênio</Label>
                <input
                  className="form-input"
                  value={data.cnabConvenio}
                  onChange={(e) => up("cnabConvenio", e.target.value)}
                />
              </div>
              <div>
                <Label>Código cedente</Label>
                <input
                  className="form-input"
                  value={data.cnabCedenteCodigo}
                  onChange={(e) => up("cnabCedenteCodigo", e.target.value)}
                />
              </div>
            </Grid2>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="font-bold text-sm mb-2">Encargos de atraso</div>
          <Grid2>
            <div>
              <Label>Multa por atraso (%)</Label>
              <input
                className="form-input"
                value={data.multaAtrasoPct}
                onChange={(e) => up("multaAtrasoPct", e.target.value)}
                placeholder="2,00"
                inputMode="decimal"
              />
            </div>
            <div>
              <Label>Juros de mora ao mês (%)</Label>
              <input
                className="form-input"
                value={data.jurosMoraMensalPct}
                onChange={(e) => up("jurosMoraMensalPct", e.target.value)}
                placeholder="1,00"
                inputMode="decimal"
              />
            </div>
          </Grid2>
        </div>
      </div>
    </>
  );
}

function Step6({ data }: { data: FormState }) {
  function Row({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex items-baseline gap-3 py-1.5 border-b border-border/40 last:border-0">
        <div className="text-[10px] uppercase tracking-[0.15em] text-fg-dim font-mono w-44 shrink-0">
          {label}
        </div>
        <div className="text-sm flex-1 break-words">{value || "—"}</div>
      </div>
    );
  }
  const modeLabel =
    data.boletosModo === "cnab"
      ? "CNAB (arquivo de remessa)"
      : data.boletosModo === "api"
        ? "API do banco"
        : "Manual";
  return (
    <>
      <Header
        title="Revisão"
        sub="Confira tudo antes de salvar. Você pode editar depois nas configurações do fundo."
      />
      <div className="space-y-1">
        <Row label="CNPJ" value={data.cnpj} />
        <Row label="Razão social" value={data.razaoSocial} />
        <Row label="Nome fantasia" value={data.nomeFantasia} />
        <Row label="Contato" value={data.contatoResponsavel} />
        <Row label="Telefone" value={data.telefone} />
        <Row label="Email comercial" value={data.emailComercial} />
        <Row label="Email assinatura" value={data.emailAssinatura} />
        <Row label="Endereço" value={`${data.endereco}, ${data.cidade}/${data.uf} · ${data.cep}`} />
        <Row label="Taxa mensal" value={`${data.taxaMensalBase}%`} />
        <Row label="Custo financeiro" value={`${data.custoFinanceiroPct}%`} />
        <Row label="Impostos" value={`${data.impostosPct}%`} />
        <Row
          label="Banco"
          value={`${data.bancoNome} ${data.bancoCodigo ? `(${data.bancoCodigo})` : ""} · Ag ${data.bancoAgencia} · CC ${data.bancoConta}`}
        />
        <Row label="PIX" value={data.bancoPix} />
        <Row label="Modo de cobrança" value={modeLabel} />
        {data.boletosModo === "api" && (
          <Row label="API URL" value={data.cobrancaApiUrl} />
        )}
        {data.boletosModo === "cnab" && (
          <Row
            label="CNAB"
            value={`Banco ${data.cnabBancoCodigo} · Carteira ${data.cnabCarteira} · Conv ${data.cnabConvenio} · Cedente ${data.cnabCedenteCodigo}`}
          />
        )}
        <Row label="Multa atraso" value={`${data.multaAtrasoPct}%`} />
        <Row label="Juros mora" value={`${data.jurosMoraMensalPct}%/mês`} />
      </div>
    </>
  );
}

/* ===========================================================
   UI HELPERS
   =========================================================== */

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4 pb-4 border-b border-border/60">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-xs text-fg-muted mt-1">{sub}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
      {children}
    </label>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}
