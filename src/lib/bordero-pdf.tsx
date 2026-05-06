import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import type { BorderoData } from "@/lib/bordero";

const COLOR_ACCENT = "#1c6dd0";
const COLOR_ACCENT_SOFT = "#e6efff";
const COLOR_FG = "#0f172a";
const COLOR_FG_MUTED = "#475569";
const COLOR_FG_DIM = "#94a3b8";
const COLOR_BORDER = "#e2e8f0";
const COLOR_WARN = "#b45309";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLOR_FG,
  },
  header: {
    backgroundColor: COLOR_ACCENT,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 18,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 26, height: 26 },
  brandText: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  brandTagline: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Helvetica",
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end" },
  headerLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerNumero: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 8,
    marginTop: 3,
  },

  fieldsGrid: { flexDirection: "row", marginBottom: 16, gap: 10 },
  fieldsCol: { flex: 1 },
  fieldLabel: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
    marginBottom: 2,
  },
  fieldValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLOR_FG,
    marginBottom: 2,
  },
  fieldValueAccent: { color: COLOR_ACCENT },
  fieldSub: {
    fontSize: 8,
    color: COLOR_FG_MUTED,
  },

  table: {
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    borderRadius: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  tableHead: {
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
  },
  tableHeadCell: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  tableRowLast: { borderBottomWidth: 0 },
  cellNum: { width: "8%", fontSize: 8, color: COLOR_FG_MUTED },
  cellDate: { width: "20%", fontSize: 8, color: COLOR_FG },
  cellPrazo: { width: "12%", fontSize: 8, color: COLOR_FG_MUTED, textAlign: "right" },
  cellAmount: { width: "20%", fontSize: 8, textAlign: "right" },

  tableTotal: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1.5,
    borderTopColor: COLOR_FG_DIM,
  },
  totalLabel: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
  },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    borderRadius: 6,
    padding: 10,
  },
  statHighlight: {
    borderColor: COLOR_ACCENT,
    backgroundColor: COLOR_ACCENT_SOFT,
  },
  statLabel: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
    marginBottom: 4,
  },
  statValue: { fontFamily: "Helvetica-Bold", fontSize: 14 },

  bankBox: {
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },
  bankTitle: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
    marginBottom: 8,
  },
  bankGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bankItem: { width: "47%", marginBottom: 4 },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLOR_FG_DIM,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingTop: 8,
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

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function fmtPct(n: number, digits = 2) {
  return (n * 100).toFixed(digits).replace(".", ",") + "%";
}

function fmtCNPJ(s: string | null) {
  if (!s) return "—";
  const c = s.replace(/\D/g, "");
  if (c.length !== 14) return s;
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function BorderoPdf({
  data,
  logoUrl,
}: {
  data: BorderoData;
  logoUrl: string;
}) {
  return (
    <Document title={`Bordero-${data.numero}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={styles.brandLogo} />
            <View>
              <Text style={styles.brandText}>ANTECIPAQUI</Text>
              <Text style={styles.brandTagline}>comissões imobiliárias</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Borderô da operação</Text>
            <Text style={styles.headerNumero}>{data.numero}</Text>
            <Text style={styles.headerSub}>
              realizada em {fmtDate(data.dataVenda)} · taxa{" "}
              {fmtPct(data.taxaMensal)} a.m.
            </Text>
          </View>
        </View>

        <View style={styles.fieldsGrid}>
          <View style={styles.fieldsCol}>
            <Text style={styles.fieldLabel}>Cedente</Text>
            <Text style={styles.fieldValue}>{data.cedente.razaoSocial}</Text>
            <Text style={styles.fieldSub}>
              {data.cedente.cnpj
                ? `CNPJ ${fmtCNPJ(data.cedente.cnpj)}`
                : `Responsável: ${data.cedente.nomeResponsavel}`}
            </Text>
          </View>
          <View style={styles.fieldsCol}>
            <Text style={styles.fieldLabel}>Sacado (construtora)</Text>
            <Text style={styles.fieldValue}>{data.construtora.razaoSocial}</Text>
            <Text style={styles.fieldSub}>
              CNPJ {fmtCNPJ(data.construtora.cnpj)}
            </Text>
          </View>
        </View>

        <View style={styles.fieldsGrid}>
          <View style={styles.fieldsCol}>
            <Text style={styles.fieldLabel}>Valor da venda</Text>
            <Text style={styles.fieldValue}>{fmtBRL(data.valorVenda)}</Text>
          </View>
          <View style={styles.fieldsCol}>
            <Text style={styles.fieldLabel}>Comissão bruta</Text>
            <Text style={[styles.fieldValue, styles.fieldValueAccent]}>
              {fmtBRL(data.valorComissao)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { width: "8%" }]}>#</Text>
            <Text style={[styles.tableHeadCell, { width: "20%" }]}>
              Vencimento
            </Text>
            <Text style={[styles.tableHeadCell, { width: "12%", textAlign: "right" }]}>
              Prazo
            </Text>
            <Text style={[styles.tableHeadCell, { width: "20%", textAlign: "right" }]}>
              Valor bruto
            </Text>
            <Text style={[styles.tableHeadCell, { width: "20%", textAlign: "right" }]}>
              Deságio
            </Text>
            <Text style={[styles.tableHeadCell, { width: "20%", textAlign: "right" }]}>
              Valor líquido
            </Text>
          </View>
          {data.parcelas.map((p, i) => (
            <View
              key={p.numero}
              style={[
                styles.tableRow,
                i === data.parcelas.length - 1 ? styles.tableRowLast : {},
              ]}
            >
              <Text style={styles.cellNum}>
                {String(p.numero).padStart(2, "0")}
              </Text>
              <Text style={styles.cellDate}>{fmtDate(p.vencimento)}</Text>
              <Text style={styles.cellPrazo}>{p.prazoDias}d</Text>
              <Text style={styles.cellAmount}>{fmtBRL(p.valorBruto)}</Text>
              <Text style={[styles.cellAmount, { color: COLOR_WARN }]}>
                {fmtBRL(p.desagio)}
              </Text>
              <Text
                style={[styles.cellAmount, { fontFamily: "Helvetica-Bold" }]}
              >
                {fmtBRL(p.valorLiquido)}
              </Text>
            </View>
          ))}
          <View style={styles.tableTotal}>
            <Text style={[styles.totalLabel, { width: "20%" }]}>
              [{data.parcelas.length}] parcela{data.parcelas.length === 1 ? "" : "s"}
            </Text>
            <Text style={[styles.totalLabel, { width: "20%", textAlign: "right" }]}>
              Total
            </Text>
            <Text style={[styles.totalValue, { width: "20%" }]}>
              {fmtBRL(data.totais.valorBruto)}
            </Text>
            <Text style={[styles.totalValue, { width: "20%", color: COLOR_WARN }]}>
              {fmtBRL(data.totais.desagio)}
            </Text>
            <Text style={[styles.totalValue, { width: "20%", color: COLOR_ACCENT }]}>
              {fmtBRL(data.totais.valorLiquido)}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Comissão bruta</Text>
            <Text style={styles.statValue}>{fmtBRL(data.totais.valorBruto)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Deságio total</Text>
            <Text style={[styles.statValue, { color: COLOR_WARN }]}>
              {fmtBRL(data.totais.desagio)}
            </Text>
          </View>
          <View
            style={data.custos.length > 0 ? styles.stat : [styles.stat, styles.statHighlight]}
          >
            <Text style={styles.statLabel}>
              {data.custos.length > 0 ? "Líquido (antes dos custos)" : "Líquido a receber"}
            </Text>
            <Text style={[styles.statValue, { color: COLOR_ACCENT }]}>
              {fmtBRL(data.totais.valorLiquido)}
            </Text>
          </View>
        </View>

        {data.custos.length > 0 && (
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>custos da operação</Text>
            {data.custos.map((c, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 3,
                  borderBottomWidth: i === data.custos.length - 1 ? 0 : 0.5,
                  borderBottomColor: COLOR_BORDER,
                }}
              >
                <Text style={{ fontSize: 9 }}>{c.titulo}</Text>
                <Text style={{ fontSize: 9, color: COLOR_WARN, fontFamily: "Helvetica-Bold" }}>
                  − {fmtBRL(c.valor)}
                </Text>
              </View>
            ))}
            <View style={[styles.statsRow, { marginTop: 10, marginBottom: 0 }]}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Líquido bruto</Text>
                <Text style={styles.statValue}>
                  {fmtBRL(data.totais.valorLiquido)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Custos total</Text>
                <Text style={[styles.statValue, { color: COLOR_WARN }]}>
                  − {fmtBRL(data.totais.custosTotal)}
                </Text>
              </View>
              <View style={[styles.stat, styles.statHighlight]}>
                <Text style={styles.statLabel}>Líquido cedente</Text>
                <Text style={[styles.statValue, { color: COLOR_ACCENT }]}>
                  {fmtBRL(data.totais.valorLiquidoCedente)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {(data.cedente.bancoNome || data.cedente.bancoConta) && (
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>
              pagamento — dados bancários do cedente
            </Text>
            <View style={styles.bankGrid}>
              <View style={styles.bankItem}>
                <Text style={styles.fieldLabel}>Banco</Text>
                <Text>{data.cedente.bancoNome ?? "—"}</Text>
              </View>
              <View style={styles.bankItem}>
                <Text style={styles.fieldLabel}>Código</Text>
                <Text>{data.cedente.bancoCodigo ?? "—"}</Text>
              </View>
              <View style={styles.bankItem}>
                <Text style={styles.fieldLabel}>Agência</Text>
                <Text>{data.cedente.bancoAgencia ?? "—"}</Text>
              </View>
              <View style={styles.bankItem}>
                <Text style={styles.fieldLabel}>Conta</Text>
                <Text>{data.cedente.bancoConta ?? "—"}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text>
            {data.fundo ? `fundo · ${data.fundo.razaoSocial}` : ""}
            {data.fundo && data.comercial ? "    " : ""}
            {data.comercial ? `comercial · ${data.comercial.nome}` : ""}
          </Text>
          <Text>taxa aplicada {fmtPct(data.taxaMensal)} a.m.</Text>
        </View>
      </Page>
    </Document>
  );
}
