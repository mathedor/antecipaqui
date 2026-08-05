import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ExtratoLinha } from "@/lib/actions/construtora-operacional";

const COLOR_ACCENT = "#1c6dd0";
const COLOR_FG = "#0f172a";
const COLOR_FG_DIM = "#94a3b8";
const COLOR_BORDER = "#e2e8f0";
const COLOR_SUCCESS = "#15803d";
const COLOR_DANGER = "#b91c1c";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: COLOR_FG },
  header: {
    backgroundColor: COLOR_ACCENT,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 14,
  },
  title: { color: "#FFF", fontFamily: "Helvetica-Bold", fontSize: 13 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 7 },
  stats: { flexDirection: "row", gap: 6, marginBottom: 12 },
  stat: {
    borderColor: COLOR_BORDER,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    flex: 1,
  },
  statLabel: {
    fontSize: 6.5,
    color: COLOR_FG_DIM,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLOR_ACCENT,
    color: "#FFF",
    padding: 6,
    borderRadius: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  rowAlt: { backgroundColor: "#f8fafc" },
  headCell: {
    color: "#FFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textTransform: "uppercase",
  },
  cell: { fontSize: 8 },
  cData: { width: "13%" },
  cStatus: { width: "13%" },
  cOp: { width: "14%" },
  cParc: { width: "10%" },
  cValor: { width: "25%", textAlign: "right" },
  cPago: { width: "25%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7,
    color: COLOR_FG_DIM,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    paddingTop: 6,
  },
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<string, string> = {
  parcela_paga: "Paga",
  parcela_a_vencer: "A vencer",
  parcela_vencida: "Vencida",
};

export function ExtratoConstrutoraPdf({
  construtoraNome,
  periodo,
  linhas,
  totais,
}: {
  construtoraNome: string;
  periodo: { from?: string; to?: string };
  linhas: ExtratoLinha[];
  totais: { pago: number; aberto: number; vencido: number };
}) {
  const geradoEm = new Date().toLocaleString("pt-BR");
  return (
    <Document title={`Extrato-${construtoraNome}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Extrato financeiro</Text>
            <Text style={styles.subtitle}>{construtoraNome}</Text>
          </View>
          <View>
            <Text style={[styles.subtitle, { textAlign: "right" }]}>
              {periodo.from || periodo.to
                ? `Período: ${periodo.from ? fmtDate(periodo.from) : "início"} a ${
                    periodo.to ? fmtDate(periodo.to) : "fim"
                  }`
                : "Todo período"}
            </Text>
            <Text style={[styles.subtitle, { textAlign: "right" }]}>
              Gerado em {geradoEm}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Pago</Text>
            <Text style={[styles.statValue, { color: COLOR_SUCCESS }]}>
              {fmtBRL(totais.pago)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>A vencer</Text>
            <Text style={styles.statValue}>{fmtBRL(totais.aberto)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Vencido</Text>
            <Text style={[styles.statValue, { color: COLOR_DANGER }]}>
              {fmtBRL(totais.vencido)}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={[styles.headCell, styles.cData]}>Data</Text>
          <Text style={[styles.headCell, styles.cStatus]}>Status</Text>
          <Text style={[styles.headCell, styles.cOp]}>Op</Text>
          <Text style={[styles.headCell, styles.cParc]}>Parc</Text>
          <Text style={[styles.headCell, styles.cValor]}>Valor</Text>
          <Text style={[styles.headCell, styles.cPago]}>Pago</Text>
        </View>

        {linhas.map((l, i) => (
          <View
            key={i}
            style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}
            wrap={false}
          >
            <Text style={[styles.cell, styles.cData]}>{fmtDate(l.data)}</Text>
            <Text
              style={[
                styles.cell,
                styles.cStatus,
                l.tipo === "parcela_paga"
                  ? { color: COLOR_SUCCESS }
                  : l.tipo === "parcela_vencida"
                    ? { color: COLOR_DANGER }
                    : {},
              ]}
            >
              {STATUS_LABEL[l.tipo]}
            </Text>
            <Text style={[styles.cell, styles.cOp]}>{l.operacaoNumero}</Text>
            <Text style={[styles.cell, styles.cParc]}>{l.parcelaNumero}</Text>
            <Text style={[styles.cell, styles.cValor]}>{fmtBRL(l.valor)}</Text>
            <Text style={[styles.cell, styles.cPago]}>
              {l.valorPago !== null ? fmtBRL(l.valorPago) : "—"}
            </Text>
          </View>
        ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Antecipaqui · Extrato ${construtoraNome} · ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
