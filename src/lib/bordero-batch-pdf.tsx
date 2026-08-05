import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
} from "@react-pdf/renderer";
import type { BorderosBatchResult } from "@/lib/borderos-batch";

const COLOR_ACCENT = "#1c6dd0";
const COLOR_ACCENT_SOFT = "#e6efff";
const COLOR_FG = "#0f172a";
const COLOR_FG_DIM = "#94a3b8";
const COLOR_BORDER = "#e2e8f0";
const COLOR_SUCCESS = "#15803d";
const COLOR_WARN = "#b45309";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: COLOR_FG,
  },
  header: {
    backgroundColor: COLOR_ACCENT,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 22, height: 22 },
  brandText: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  brandTagline: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Helvetica",
    fontSize: 6,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end" },
  headerLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 6,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 7,
    marginTop: 2,
  },

  filtersBox: {
    backgroundColor: COLOR_ACCENT_SOFT,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  filterRow: { flexDirection: "row", marginBottom: 2 },
  filterLabel: {
    width: 80,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
  },
  filterValue: { fontSize: 8, color: COLOR_FG, fontFamily: "Helvetica-Bold" },

  statsGrid: { flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  statCard: {
    borderColor: COLOR_BORDER,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    width: "23%",
  },
  statLabel: {
    fontSize: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR_FG_DIM,
    marginBottom: 2,
  },
  statValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLOR_FG },
  statSuccess: { color: COLOR_SUCCESS },
  statWarn: { color: COLOR_WARN },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLOR_ACCENT,
    color: "#FFFFFF",
    padding: 6,
    borderRadius: 4,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  cell: { fontSize: 7 },
  cellHead: {
    fontSize: 6.5,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cellNumero: { width: "10%" },
  cellData: { width: "8%" },
  cellCedente: { width: "16%" },
  cellConstr: { width: "16%" },
  cellFundo: { width: "12%" },
  cellMoney: { width: "12%", textAlign: "right" },
  cellMoneyEnd: { width: "14%", textAlign: "right" },

  totalsRow: {
    flexDirection: "row",
    backgroundColor: COLOR_ACCENT_SOFT,
    padding: 6,
    borderTopWidth: 1,
    borderTopColor: COLOR_ACCENT,
    marginTop: 2,
  },
  totalsCell: { fontFamily: "Helvetica-Bold", fontSize: 8 },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 6.5,
    color: COLOR_FG_DIM,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    paddingTop: 6,
  },
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<string, string> = {
  aguardando_aprovacao: "Aguard. aprovação",
  documentos_incompletos: "Docs incompletos",
  pre_aprovada: "Pré-aprovada",
  analise_final: "Análise final",
  enviada_para_assinatura: "Em assinatura",
  enviada_para_pagamento: "Em pagamento",
  realizada: "Realizada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

type LookupNames = {
  fundoNome?: string | null;
  construtoraNome?: string | null;
  imobiliariaNome?: string | null;
  comercialNome?: string | null;
};

export function BorderoBatchPdf({
  batch,
  logoUrl,
  lookupNames = {},
}: {
  batch: BorderosBatchResult;
  logoUrl?: string;
  lookupNames?: LookupNames;
}) {
  const { rows, agregados, filtros } = batch;
  const geradoEm = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logoUrl && <Image src={logoUrl} style={styles.brandLogo} />}
            <View>
              <Text style={styles.brandText}>Antecipaqui</Text>
              <Text style={styles.brandTagline}>borderô consolidado</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>operações</Text>
            <Text style={styles.headerTitle}>
              {agregados.qtdOperacoes} operaç{agregados.qtdOperacoes === 1 ? "ão" : "ões"}
            </Text>
            <Text style={styles.headerSub}>Gerado em {geradoEm}</Text>
          </View>
        </View>

        {/* Filtros aplicados */}
        <View style={styles.filtersBox}>
          <FilterRow
            label="Período"
            value={
              filtros.from || filtros.to
                ? `${filtros.from ? fmtDate(filtros.from) : "início"} a ${
                    filtros.to ? fmtDate(filtros.to) : "fim"
                  }`
                : "Todo período"
            }
          />
          <FilterRow
            label="Fundo"
            value={
              filtros.fundoId
                ? (lookupNames.fundoNome ?? filtros.fundoId)
                : "Todos"
            }
          />
          <FilterRow
            label="Construtora"
            value={
              filtros.construtoraId
                ? (lookupNames.construtoraNome ?? filtros.construtoraId)
                : "Todas"
            }
          />
          <FilterRow
            label="Imobiliária"
            value={
              filtros.imobiliariaId
                ? (lookupNames.imobiliariaNome ?? filtros.imobiliariaId)
                : "Todas"
            }
          />
          <FilterRow
            label="Comercial"
            value={
              filtros.comercialId
                ? (lookupNames.comercialNome ?? filtros.comercialId)
                : "Todos"
            }
          />
          <FilterRow
            label="Status"
            value={
              filtros.status
                ? (STATUS_LABEL[filtros.status] ?? filtros.status)
                : "Todos"
            }
          />
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="Operações" value={String(agregados.qtdOperacoes)} />
          <StatCard label="Valor de venda" value={fmtBRL(agregados.valorVendaTotal)} />
          <StatCard label="Comissão bruta" value={fmtBRL(agregados.bruto)} />
          <StatCard
            label="Líquido cedente"
            value={fmtBRL(agregados.liquidoCedente)}
            tone="success"
          />
          <StatCard
            label="Deságio total"
            value={fmtBRL(agregados.desagio)}
            tone="warn"
          />
          <StatCard label="Líquido (s/ custos)" value={fmtBRL(agregados.liquido)} />
          <StatCard
            label="Custos"
            value={fmtBRL(agregados.custos)}
            tone="warn"
          />
          <StatCard
            label="Comissão original"
            value={fmtBRL(agregados.valorComissaoTotal)}
          />
        </View>

        {/* Tabela */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.cellHead, styles.cellNumero]}>Op</Text>
          <Text style={[styles.cellHead, styles.cellData]}>Data</Text>
          <Text style={[styles.cellHead, styles.cellCedente]}>Cedente</Text>
          <Text style={[styles.cellHead, styles.cellConstr]}>Construtora</Text>
          <Text style={[styles.cellHead, styles.cellFundo]}>Fundo</Text>
          <Text style={[styles.cellHead, styles.cellMoney]}>Bruto</Text>
          <Text style={[styles.cellHead, styles.cellMoney]}>Deságio</Text>
          <Text style={[styles.cellHead, styles.cellMoneyEnd]}>Líq. cedente</Text>
        </View>

        {rows.map((r, i) => (
          <View
            key={r.id}
            style={[
              styles.tableRow,
              i % 2 === 1 ? styles.tableRowAlt : {},
            ]}
            wrap={false}
          >
            <Text style={[styles.cell, styles.cellNumero]}>{r.numero}</Text>
            <Text style={[styles.cell, styles.cellData]}>
              {fmtDate(r.dataVenda)}
            </Text>
            <Text style={[styles.cell, styles.cellCedente]}>
              {r.cedenteNome}
            </Text>
            <Text style={[styles.cell, styles.cellConstr]}>
              {r.construtoraNome}
            </Text>
            <Text style={[styles.cell, styles.cellFundo]}>
              {r.fundoNome ?? "—"}
            </Text>
            <Text style={[styles.cell, styles.cellMoney]}>
              {fmtBRL(r.totaisBruto)}
            </Text>
            <Text
              style={[styles.cell, styles.cellMoney, { color: COLOR_WARN }]}
            >
              {fmtBRL(r.totaisDesagio)}
            </Text>
            <Text
              style={[
                styles.cell,
                styles.cellMoneyEnd,
                { color: COLOR_SUCCESS, fontFamily: "Helvetica-Bold" },
              ]}
            >
              {fmtBRL(r.valorLiquidoCedente)}
            </Text>
          </View>
        ))}

        {/* Totais */}
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsCell, styles.cellNumero]}>TOTAL</Text>
          <Text style={[styles.totalsCell, styles.cellData]}>
            {rows.length} op
          </Text>
          <Text style={[styles.totalsCell, styles.cellCedente]} />
          <Text style={[styles.totalsCell, styles.cellConstr]} />
          <Text style={[styles.totalsCell, styles.cellFundo]} />
          <Text style={[styles.totalsCell, styles.cellMoney]}>
            {fmtBRL(agregados.bruto)}
          </Text>
          <Text
            style={[styles.totalsCell, styles.cellMoney, { color: COLOR_WARN }]}
          >
            {fmtBRL(agregados.desagio)}
          </Text>
          <Text
            style={[
              styles.totalsCell,
              styles.cellMoneyEnd,
              { color: COLOR_SUCCESS },
            ]}
          >
            {fmtBRL(agregados.liquidoCedente)}
          </Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Antecipaqui · Relatório de borderôs · ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

function FilterRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Text style={styles.filterValue}>{value}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warn";
}) {
  const toneStyle =
    tone === "success"
      ? styles.statSuccess
      : tone === "warn"
        ? styles.statWarn
        : undefined;
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={toneStyle ? [styles.statValue, toneStyle] : styles.statValue}>
        {value}
      </Text>
    </View>
  );
}
