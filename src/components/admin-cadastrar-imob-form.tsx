"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cadastrarImobiliariaAction,
  type CadastrarImobState,
} from "@/lib/actions/admin-cadastrar";
import { CepAddressFields } from "@/components/cep-address-fields";
import { FileUploadField } from "@/components/file-upload-field";
import { useFeedback } from "@/components/feedback-provider";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";

export function AdminCadastrarImobForm() {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    CadastrarImobState,
    FormData
  >(cadastrarImobiliariaAction, null);

  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        "Imobiliária cadastrada e convite Clerk disparado pro responsável.",
        "Pronto",
      ).then(() => router.push("/admin/usuarios"));
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao cadastrar");
    }
  }, [state, router, alertSuccess, alertError]);

  return (
    <form action={action} className="space-y-6">
      <Card title="Empresa cedente">
        <Grid>
          <Field label="Razão social *">
            <input name="razaoSocial" required className="form-input" />
          </Field>
          <Field label="Nome fantasia">
            <input name="nomeFantasia" className="form-input" />
          </Field>
          <Field label="CNPJ *">
            <input
              name="cnpj"
              required
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className="form-input font-mono"
            />
          </Field>
          <Field label="CRECI responsável">
            <input name="creci" placeholder="J-12345" className="form-input" />
          </Field>
          <Field label="Telefone">
            <input
              name="telefone"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
              placeholder="(00) 00000-0000"
              className="form-input"
            />
          </Field>
          <CepAddressFields optional />
        </Grid>
      </Card>

      <Card
        title="Responsável (login)"
        subtitle="Pessoa física que vai acessar o painel. Recebe email de convite Clerk pra definir senha."
      >
        <Grid>
          <Field label="Nome do responsável">
            <input name="responsavelNome" className="form-input" />
          </Field>
          <Field label="Email do responsável *">
            <input
              name="responsavelEmail"
              type="email"
              required
              placeholder="responsavel@imobiliaria.com.br"
              className="form-input font-mono text-xs"
            />
          </Field>
          <Field label="Tipo de cadastro *">
            <select name="role" defaultValue="corretor" className="form-input">
              <option value="corretor">Corretor (PF)</option>
              <option value="imobiliaria">Imobiliária (PJ)</option>
            </select>
          </Field>
        </Grid>
      </Card>

      <Card
        title="Dados bancários (opcional)"
        subtitle="Usados na cessão de comissão (cláusula 3ª do contrato). Podem ser preenchidos depois."
      >
        <Grid>
          <Field label="Banco (nome)">
            <input name="bancoNome" placeholder="Itaú" className="form-input" />
          </Field>
          <Field label="Código">
            <input
              name="bancoCodigo"
              placeholder="341"
              className="form-input font-mono"
            />
          </Field>
          <Field label="Agência">
            <input
              name="bancoAgencia"
              placeholder="0001-2"
              className="form-input font-mono"
            />
          </Field>
          <Field label="Conta">
            <input
              name="bancoConta"
              placeholder="12345-6"
              className="form-input font-mono"
            />
          </Field>
        </Grid>
      </Card>

      <Card
        title="Documentos KYC (opcional)"
        subtitle="Você pode subir agora ou solicitar via cobrança depois. Recomendado: 3 documentos básicos."
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <FileUploadField
            label="Contrato social"
            name="doc_contrato_social"
            tipo="contrato_social"
            folder="kyc/imob-cadastro/contrato-social"
            description="PDF do contrato social ou MEI"
          />
          <FileUploadField
            label="Comprovante de endereço"
            name="doc_comprovante_endereco"
            tipo="comprovante_endereco"
            folder="kyc/imob-cadastro/comprovante-endereco"
            description="Conta de luz, água ou telefone"
          />
          <FileUploadField
            label="Cartão CNPJ"
            name="doc_cartao_cnpj"
            tipo="cartao_cnpj"
            folder="kyc/imob-cadastro/cartao-cnpj"
            description="Cartão CNPJ atualizado"
          />
        </div>
      </Card>

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending ? "Cadastrando..." : "Cadastrar e enviar convite"}
      </button>
    </form>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
      <h3 className="font-bold mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-fg-muted mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">{children}</div>;
}
