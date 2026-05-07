import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
} from "@react-pdf/renderer";
import type { InvoicePayload } from "@/lib/actions/invoice";
import type { AntecipaquiData } from "@/lib/antecipaqui-fundo";

const COLOR_ACCENT = "#1c6dd0";
const COLOR_ACCENT_SOFT = "#e6efff";
const COLOR_FG = "#0f172a";
const COLOR_FG_MUTED = "#475569";
const COLOR_FG_DIM = "#94a3b8";
const COLOR_BORDER = "#e2e8f0";
const COLOR_WARN = "#b45309";
const COLOR_SUCCESS = "#15803d";

const MARCA = "ANTECIPAQUI";

function fmtPhone(p: string | null) {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return p;
}
function fmtCep(c: string | null) {
  if (!c) return "";
  const d = c.replace(/\D/g, "");
  if (d.length === 8) return d.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  return c;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 8.5, fontFamily: "Helvetica", color: COLOR_FG },

  // Header
  header: {
    backgroundColor: COLOR_ACCENT,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 6,
    marginBottom: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { width: 32, height: 32 },
  brandText: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  brandTagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end" },
  invoiceLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  invoiceNumber: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  invoiceDate: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 8,
    marginTop: 4,
  },

  // DE / PARA
  fromToRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  fromToBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    borderRadius: 5,
    padding: 10,
  },
  fromToLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
    marginBottom: 4,
  },
  partyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLOR_FG,
    marginBottom: 3,
  },
  partyDetail: { fontSize: 8, color: COLOR_FG_MUTED, marginBottom: 1.5 },

  // Periodo / resumo
  periodBox: {
    backgroundColor: COLOR_ACCENT_SOFT,
    borderWidth: 1,
    borderColor: COLOR_ACCENT,
    borderRadius: 5,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: COLOR_ACCENT,
    marginBottom: 2,
  },
  periodValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLOR_FG,
  },
  periodOps: { fontSize: 9, color: COLOR_FG_MUTED, fontFamily: "Helvetica-Bold" },

  // Tabela
  table: {
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  tableHead: {
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
  },
  tableHeadCell: {
    fontSize: 6.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  tableRowAlt: { backgroundColor: "#fbfcfd" },
  tableCell: { fontSize: 7.5, color: COLOR_FG },
  tableTotal: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#f1f5f9",
    borderTopWidth: 1.5,
    borderTopColor: COLOR_FG_DIM,
  },

  // Saldo destaque
  saldoBox: {
    borderWidth: 2,
    borderColor: COLOR_SUCCESS,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saldoLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: COLOR_SUCCESS,
    fontFamily: "Helvetica-Bold",
  },
  saldoSub: { fontSize: 8, color: COLOR_FG_MUTED, marginTop: 2 },
  saldoValor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: COLOR_SUCCESS,
  },

  // Pagamento
  pagamentoBox: {
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    borderRadius: 5,
    padding: 10,
    marginBottom: 8,
  },
  pagamentoTitle: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: COLOR_ACCENT,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  pagRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  pagItem: { width: "48%", marginBottom: 4 },
  pagLabel: {
    fontSize: 6.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
    marginBottom: 1,
  },
  pagValue: { fontSize: 9, color: COLOR_FG, fontFamily: "Helvetica-Bold" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: COLOR_FG_DIM,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
  },
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}
function fmtPct(n: number, digits = 2) {
  return (n * 100).toFixed(digits).replace(".", ",") + "%";
}
function fmtCNPJ(s: string | null | undefined) {
  if (!s) return "—";
  const c = s.replace(/\D/g, "");
  if (c.length !== 14) return s;
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const COL_WIDTHS = {
  numero: "9%",
  fundo: "11%",
  construtora: "12%",
  imob: "11%",
  data: "8%",
  valor: "10%",
  juros: "10%",
  custoFin: "10%",
  impostos: "9%",
  saldo: "10%",
};

export type InvoicePdfData = {
  numero: string; // INV-2026-0001
  emittedAt: Date;
  fundoUnico?: {
    razaoSocial: string;
    cnpj: string;
    cidade: string | null;
    uf: string | null;
    endereco: string | null;
  } | null;
  payload: InvoicePayload;
  logoUrl: string;
  /** Dados do credor (Antecipaqui) lidos do registro do fundo. */
  emitente: AntecipaquiData;
};

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const { rows, totals, periodLabel } = data.payload;
  const e = data.emitente;
  return (
    <Document title={`Invoice-${data.numero}`}>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.brandRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.logoUrl} style={styles.brandLogo} />
            <View>
              <Text style={styles.brandText}>{MARCA}</Text>
              <Text style={styles.brandTagline}>
                fatura · repasse de comissão antecipada
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceLabel}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{data.numero}</Text>
            <Text style={styles.invoiceDate}>
              emitida em{" "}
              {data.emittedAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* DE / PARA — DE = quem paga (fundo), PARA = quem recebe (Antecipaqui) */}
        <View style={styles.fromToRow}>
          <View style={styles.fromToBox}>
            <Text style={styles.fromToLabel}>De · pagador</Text>
            {data.fundoUnico ? (
              <>
                <Text style={styles.partyName}>
                  {data.fundoUnico.razaoSocial}
                </Text>
                <Text style={styles.partyDetail}>
                  CNPJ {fmtCNPJ(data.fundoUnico.cnpj)}
                </Text>
                {data.fundoUnico.endereco && (
                  <Text style={styles.partyDetail}>
                    {data.fundoUnico.endereco}
                  </Text>
                )}
                {(data.fundoUnico.cidade || data.fundoUnico.uf) && (
                  <Text style={styles.partyDetail}>
                    {data.fundoUnico.cidade ?? ""}
                    {data.fundoUnico.uf ? `/${data.fundoUnico.uf}` : ""}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.partyName}>Múltiplos fundos</Text>
                <Text style={styles.partyDetail}>
                  Demonstrativo consolidado — detalhes por operação na tabela
                  abaixo.
                </Text>
              </>
            )}
          </View>
          <View style={styles.fromToBox}>
            <Text style={styles.fromToLabel}>Para · recebedor</Text>
            <Text style={styles.partyName}>{e.razaoSocial}</Text>
            <Text style={styles.partyDetail}>CNPJ {fmtCNPJ(e.cnpj)}</Text>
            {e.endereco && (
              <Text style={styles.partyDetail}>{e.endereco}</Text>
            )}
            {(e.cidade || e.uf || e.cep) && (
              <Text style={styles.partyDetail}>
                {e.cidade ?? ""}
                {e.uf ? `/${e.uf}` : ""}
                {e.cep ? ` · CEP ${fmtCep(e.cep)}` : ""}
              </Text>
            )}
            {(e.email || e.telefone) && (
              <Text style={styles.partyDetail}>
                {e.email ?? ""}
                {e.email && e.telefone ? " · " : ""}
                {e.telefone ? fmtPhone(e.telefone) : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Periodo */}
        <View style={styles.periodBox}>
          <View>
            <Text style={styles.periodLabel}>período de referência</Text>
            <Text style={styles.periodValue}>
              {fmtDate(periodLabel.from)} → {fmtDate(periodLabel.to)}
            </Text>
          </View>
          <Text style={styles.periodOps}>
            {rows.length} operaç{rows.length === 1 ? "ão" : "ões"} no período
          </Text>
        </View>

        {/* Tabela */}
        <View style={styles.table}>
          <View style={styles.tableHead} fixed>
            <Text style={[styles.tableHeadCell, { width: COL_WIDTHS.numero }]}>
              Operação
            </Text>
            <Text style={[styles.tableHeadCell, { width: COL_WIDTHS.fundo }]}>
              Fundo
            </Text>
            <Text
              style={[styles.tableHeadCell, { width: COL_WIDTHS.construtora }]}
            >
              Construtora
            </Text>
            <Text style={[styles.tableHeadCell, { width: COL_WIDTHS.imob }]}>
              Imobiliária
            </Text>
            <Text style={[styles.tableHeadCell, { width: COL_WIDTHS.data }]}>
              Aprovado
            </Text>
            <Text
              style={[
                styles.tableHeadCell,
                { width: COL_WIDTHS.valor, textAlign: "right" },
              ]}
            >
              Valor op.
            </Text>
            <Text
              style={[
                styles.tableHeadCell,
                { width: COL_WIDTHS.juros, textAlign: "right" },
              ]}
            >
              Juros
            </Text>
            <Text
              style={[
                styles.tableHeadCell,
                { width: COL_WIDTHS.custoFin, textAlign: "right" },
              ]}
            >
              Custo fin.
            </Text>
            <Text
              style={[
                styles.tableHeadCell,
                { width: COL_WIDTHS.impostos, textAlign: "right" },
              ]}
            >
              Impostos
            </Text>
            <Text
              style={[
                styles.tableHeadCell,
                { width: COL_WIDTHS.saldo, textAlign: "right" },
              ]}
            >
              Saldo repasse
            </Text>
          </View>
          {rows.map((r, i) => (
            <View
              key={r.operacaoId}
              style={[
                styles.tableRow,
                i % 2 === 1 ? styles.tableRowAlt : {},
              ]}
              wrap={false}
            >
              <Text
                style={[
                  styles.tableCell,
                  { width: COL_WIDTHS.numero, fontFamily: "Helvetica-Bold" },
                ]}
              >
                {r.operacaoNumero}
              </Text>
              <Text
                style={[styles.tableCell, { width: COL_WIDTHS.fundo }]}
              >
                {(r.fundoNome ?? "—").slice(0, 22)}
              </Text>
              <Text
                style={[styles.tableCell, { width: COL_WIDTHS.construtora }]}
              >
                {(r.construtoraNome ?? "—").slice(0, 24)}
              </Text>
              <Text style={[styles.tableCell, { width: COL_WIDTHS.imob }]}>
                {(r.imobiliariaNome ?? "—").slice(0, 22)}
              </Text>
              <Text style={[styles.tableCell, { width: COL_WIDTHS.data }]}>
                {fmtDate(r.dataAprovacao)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { width: COL_WIDTHS.valor, textAlign: "right" },
                ]}
              >
                {fmtBRL(r.valorOperacao)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { width: COL_WIDTHS.juros, textAlign: "right" },
                ]}
              >
                {fmtBRL(r.juros)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    width: COL_WIDTHS.custoFin,
                    textAlign: "right",
                    color: COLOR_ACCENT,
                  },
                ]}
              >
                {fmtBRL(r.custoFinanceiro)}
                {"\n"}
                <Text style={{ fontSize: 6.5, color: COLOR_FG_DIM }}>
                  ({fmtPct(r.custoFinanceiroPct)})
                </Text>
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    width: COL_WIDTHS.impostos,
                    textAlign: "right",
                    color: COLOR_WARN,
                  },
                ]}
              >
                {fmtBRL(r.impostos)}
                {"\n"}
                <Text style={{ fontSize: 6.5, color: COLOR_FG_DIM }}>
                  ({fmtPct(r.impostosPct)})
                </Text>
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    width: COL_WIDTHS.saldo,
                    textAlign: "right",
                    fontFamily: "Helvetica-Bold",
                    color: COLOR_SUCCESS,
                  },
                ]}
              >
                {fmtBRL(r.saldoRepasse)}
              </Text>
            </View>
          ))}
          {/* Totais */}
          <View style={styles.tableTotal} wrap={false}>
            <Text
              style={[
                styles.tableHeadCell,
                {
                  width: `${parseFloat(COL_WIDTHS.numero) + parseFloat(COL_WIDTHS.fundo) + parseFloat(COL_WIDTHS.construtora) + parseFloat(COL_WIDTHS.imob) + parseFloat(COL_WIDTHS.data)}%`,
                  fontSize: 8,
                  textTransform: "uppercase",
                  color: COLOR_FG,
                },
              ]}
            >
              Totais ({rows.length} ops)
            </Text>
            <Text
              style={[
                styles.tableCell,
                {
                  width: COL_WIDTHS.valor,
                  textAlign: "right",
                  fontFamily: "Helvetica-Bold",
                  fontSize: 8.5,
                },
              ]}
            >
              {fmtBRL(totals.valorOperacao)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                {
                  width: COL_WIDTHS.juros,
                  textAlign: "right",
                  fontFamily: "Helvetica-Bold",
                  fontSize: 8.5,
                },
              ]}
            >
              {fmtBRL(totals.juros)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                {
                  width: COL_WIDTHS.custoFin,
                  textAlign: "right",
                  fontFamily: "Helvetica-Bold",
                  fontSize: 8.5,
                  color: COLOR_ACCENT,
                },
              ]}
            >
              {fmtBRL(totals.custoFinanceiro)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                {
                  width: COL_WIDTHS.impostos,
                  textAlign: "right",
                  fontFamily: "Helvetica-Bold",
                  fontSize: 8.5,
                  color: COLOR_WARN,
                },
              ]}
            >
              {fmtBRL(totals.impostos)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                {
                  width: COL_WIDTHS.saldo,
                  textAlign: "right",
                  fontFamily: "Helvetica-Bold",
                  fontSize: 9,
                  color: COLOR_SUCCESS,
                },
              ]}
            >
              {fmtBRL(totals.saldoRepasse)}
            </Text>
          </View>
        </View>

        {/* Saldo grande */}
        <View style={styles.saldoBox} wrap={false}>
          <View>
            <Text style={styles.saldoLabel}>Saldo a repassar</Text>
            <Text style={styles.saldoSub}>
              período {fmtDate(periodLabel.from)} → {fmtDate(periodLabel.to)}
            </Text>
          </View>
          <Text style={styles.saldoValor}>
            {fmtBRL(totals.saldoRepasse)}
          </Text>
        </View>

        {/* Dados pra pagamento */}
        <View style={styles.pagamentoBox} wrap={false}>
          <Text style={styles.pagamentoTitle}>
            instruções para pagamento — credor
          </Text>
          <View style={styles.pagRow}>
            <View style={styles.pagItem}>
              <Text style={styles.pagLabel}>
                PIX{e.bancoPix && e.bancoPix.replace(/\D/g, "").length === 14 ? " (CNPJ)" : ""}
              </Text>
              <Text style={styles.pagValue}>
                {e.bancoPix
                  ? e.bancoPix.replace(/\D/g, "").length === 14
                    ? fmtCNPJ(e.bancoPix)
                    : e.bancoPix
                  : "—"}
              </Text>
            </View>
            <View style={styles.pagItem}>
              <Text style={styles.pagLabel}>Razão social</Text>
              <Text style={styles.pagValue}>{e.razaoSocial}</Text>
            </View>
            <View style={styles.pagItem}>
              <Text style={styles.pagLabel}>Banco / Agência / Conta</Text>
              <Text style={styles.pagValue}>
                {e.bancoNome ?? "—"}
                {e.bancoCodigo ? ` (${e.bancoCodigo})` : ""} · ag{" "}
                {e.bancoAgencia ?? "—"} · cc {e.bancoConta ?? "—"}
              </Text>
            </View>
            <View style={styles.pagItem}>
              <Text style={styles.pagLabel}>Contato</Text>
              <Text style={styles.pagValue}>{e.email ?? "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {MARCA} · {e.razaoSocial} · CNPJ {fmtCNPJ(e.cnpj)}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `página ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}