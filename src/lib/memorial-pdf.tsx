/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
} from "@react-pdf/renderer";

const ACCENT = "#1c6dd0";
const ACCENT_SOFT = "#e6efff";
const FG = "#0f172a";
const FG_MUTED = "#475569";
const FG_DIM = "#94a3b8";
const BORDER = "#e2e8f0";
const BG_CARD = "#f8fafc";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: FG,
    lineHeight: 1.5,
  },
  capaPage: {
    padding: 0,
    backgroundColor: ACCENT,
    fontFamily: "Helvetica",
  },
  capaHeader: {
    height: "100%",
    padding: 60,
    justifyContent: "center",
  },
  capaLogo: { width: 80, height: 80, marginBottom: 30 },
  capaEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  capaTitle: {
    color: "#FFF",
    fontSize: 42,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
    marginBottom: 14,
  },
  capaSubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    maxWidth: 460,
    marginBottom: 50,
    lineHeight: 1.5,
  },
  capaMetaBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderLeftWidth: 3,
    borderLeftColor: "#FFF",
    paddingLeft: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  capaMetaLine: { color: "#FFF", fontSize: 10, marginBottom: 4 },
  capaMetaLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  capaFooter: {
    position: "absolute",
    bottom: 40,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  capaFooterLogo: {
    color: "#FFF",
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },
  capaFooterTag: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 10,
    marginBottom: 16,
  },
  pageHeaderTitle: {
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pageHeaderRight: {
    fontSize: 7.5,
    color: FG_DIM,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: FG,
    marginBottom: 6,
    lineHeight: 1.2,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: ACCENT,
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: ACCENT_SOFT,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: FG,
    marginTop: 12,
    marginBottom: 5,
  },
  p: { fontSize: 10, color: FG_MUTED, marginBottom: 6 },
  pPlain: { fontSize: 10, color: FG, marginBottom: 6 },
  small: { fontSize: 8, color: FG_DIM },
  eyebrow: {
    fontSize: 8,
    color: FG_DIM,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bullet: { fontSize: 9.5, color: FG, marginBottom: 3, paddingLeft: 10 },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowLast: { flexDirection: "row" },
  tableHead: { flexDirection: "row", backgroundColor: ACCENT },
  tableCellHead: {
    color: "#FFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    padding: 7,
  },
  tableCell: { fontSize: 9, color: FG, padding: 7 },
  tableCellAlt: { fontSize: 9, color: FG, padding: 7, backgroundColor: BG_CARD },
  tableCellMono: { fontFamily: "Courier", fontSize: 8 },
  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    backgroundColor: BG_CARD,
  },
  cardAccent: {
    borderWidth: 1,
    borderColor: ACCENT_SOFT,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    backgroundColor: ACCENT_SOFT,
  },
  cardTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: FG,
    marginBottom: 3,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    backgroundColor: "#0f172a",
    padding: 10,
    marginBottom: 8,
  },
  codeText: {
    fontFamily: "Courier",
    fontSize: 8.5,
    color: "#fef3c7",
    lineHeight: 1.5,
  },
  screenshotBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 12,
  },
  screenshotImage: { width: "100%" },
  screenshotCaption: {
    fontSize: 7.5,
    color: FG_DIM,
    padding: 4,
    paddingLeft: 8,
    backgroundColor: BG_CARD,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: FG_DIM,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

export type Shots = Record<string, string>;

function PageWrapper({
  children,
  sectionLabel,
}: {
  children: React.ReactNode;
  sectionLabel: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader} fixed>
        <Text style={styles.pageHeaderTitle}>ANTECIPAQUI · Memorial</Text>
        <Text style={styles.pageHeaderRight}>{sectionLabel}</Text>
      </View>
      {children}
      <Text
        style={styles.footer}
        render={({ pageNumber, totalPages }) => (
          <>
            <Text>antecipaqui.digital · memorial descritivo v2</Text>
            <Text>
              {pageNumber} / {totalPages}
            </Text>
          </>
        )}
        fixed
      />
    </Page>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: "Courier", fontSize: 9 }}>{children}</Text>;
}

function Italic({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: "Helvetica-Oblique" }}>{children}</Text>;
}

function Screenshot({
  shots,
  nome,
  caption,
}: {
  shots: Shots;
  nome: string;
  caption: string;
}) {
  const src = shots[nome];
  if (!src) return null;
  return (
    <View style={styles.screenshotBox} wrap={false}>
      <Image src={src} style={styles.screenshotImage} />
      <Text style={styles.screenshotCaption}>Figura · {caption}</Text>
    </View>
  );
}

function Row2({
  l,
  r,
  alt = false,
  mono = false,
}: {
  l: string;
  r: string;
  alt?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.tableRow}>
      <Text
        style={[
          alt ? styles.tableCellAlt : styles.tableCell,
          { width: "35%", fontFamily: mono ? "Courier" : "Helvetica-Bold" },
        ]}
      >
        {l}
      </Text>
      <Text
        style={[alt ? styles.tableCellAlt : styles.tableCell, { width: "65%" }]}
      >
        {r}
      </Text>
    </View>
  );
}

function Row3({
  l,
  m,
  r,
  alt = false,
  mono = false,
}: {
  l: string;
  m: string;
  r: string;
  alt?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.tableRow}>
      <Text
        style={[
          alt ? styles.tableCellAlt : styles.tableCell,
          { width: "40%", fontFamily: mono ? "Courier" : "Helvetica-Bold" },
        ]}
      >
        {l}
      </Text>
      <Text style={[alt ? styles.tableCellAlt : styles.tableCell, { width: "25%" }]}>
        {m}
      </Text>
      <Text style={[alt ? styles.tableCellAlt : styles.tableCell, { width: "35%" }]}>
        {r}
      </Text>
    </View>
  );
}

function ToCItem({ n, t }: { n: string; t: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 5,
        paddingBottom: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: BORDER,
      }}
    >
      <Text
        style={{ width: 32, fontFamily: "Courier", color: ACCENT, fontSize: 9 }}
      >
        {n}
      </Text>
      <Text style={{ flex: 1, fontSize: 10, color: FG }}>{t}</Text>
    </View>
  );
}

type Conta = {
  nivel: string;
  email: string;
  senha: string;
  nome: string;
};

const CONTAS: Conta[] = [
  {
    nivel: "Admin",
    email: "mathe@diretoriow.com.br",
    senha: "(via Clerk)",
    nome: "Administrador principal",
  },
  {
    nivel: "Fundo Critéria",
    email: "emiliano@criteriacapital.com.br",
    senha: "***REDACTED***",
    nome: "Emiliano (Critéria FIDC)",
  },
  {
    nivel: "Corretor (teste)",
    email: "mathe+corretor-teste@diretoriow.com.br",
    senha: "***REDACTED***",
    nome: "Carlos Andrade",
  },
  {
    nivel: "Imobiliária (teste)",
    email: "mathe+imob-teste@diretoriow.com.br",
    senha: "***REDACTED***",
    nome: "Maria Silva",
  },
  {
    nivel: "Construtora (teste)",
    email: "mathe+construtora-teste@diretoriow.com.br",
    senha: "***REDACTED***",
    nome: "Roberto Pereira",
  },
  {
    nivel: "Fundo (teste)",
    email: "mathe+fundo-teste@diretoriow.com.br",
    senha: "***REDACTED***",
    nome: "Patrícia Lima",
  },
  {
    nivel: "Comercial (teste)",
    email: "mathe+comercial-teste@diretoriow.com.br",
    senha: "***REDACTED***",
    nome: "Lucas Oliveira",
  },
];

export function MemorialPdf({
  logoBase64,
  shots = {},
}: {
  logoBase64: string;
  shots?: Shots;
}) {
  const dataGeracao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title="Antecipaqui · Memorial Descritivo"
      author="Antecipaqui"
      subject="Documentação completa da plataforma"
    >
      {/* CAPA */}
      <Page size="A4" style={styles.capaPage}>
        <View style={styles.capaHeader}>
          {logoBase64 ? <Image src={logoBase64} style={styles.capaLogo} /> : null}
          <Text style={styles.capaEyebrow}>plataforma antecipaqui</Text>
          <Text style={styles.capaTitle}>Memorial{"\n"}Descritivo</Text>
          <Text style={styles.capaSubtitle}>
            Documentação completa da plataforma de antecipação de comissões
            imobiliárias: níveis de acesso, funcionalidades, relatórios,
            cálculos financeiros e telas reais.
          </Text>
          <View style={styles.capaMetaBox}>
            <Text style={styles.capaMetaLabel}>data de emissão</Text>
            <Text style={styles.capaMetaLine}>{dataGeracao}</Text>
            <Text style={[styles.capaMetaLabel, { marginTop: 8 }]}>versão</Text>
            <Text style={styles.capaMetaLine}>v2 · com screenshots</Text>
            <Text style={[styles.capaMetaLabel, { marginTop: 8 }]}>ambiente</Text>
            <Text style={styles.capaMetaLine}>www.antecipaqui.digital</Text>
          </View>
        </View>
        <View style={styles.capaFooter}>
          <View>
            <Text style={styles.capaFooterLogo}>ANTECIPAQUI</Text>
            <Text style={styles.capaFooterTag}>
              comissões imobiliárias hoje
            </Text>
          </View>
          <Text style={styles.capaFooterTag}>memorial · v2</Text>
        </View>
      </Page>

      {/* ÍNDICE */}
      <PageWrapper sectionLabel="índice">
        <Text style={styles.eyebrow}>sumário</Text>
        <Text style={styles.h1}>O que tem neste documento</Text>
        <Text style={styles.p}>
          Visão completa da plataforma com screenshots de cada tela principal.
        </Text>
        <View style={{ marginTop: 14 }}>
          <ToCItem n="01" t="Visão geral da plataforma" />
          <ToCItem n="02" t="Páginas públicas (home, login, como funciona)" />
          <ToCItem n="03" t="Contas de teste e credenciais" />
          <ToCItem n="04" t="Nível 1 · ADMIN — telas, fluxos, decisões" />
          <ToCItem n="05" t="Operações — ciclo de vida completo" />
          <ToCItem n="06" t="Nível 2 · FUNDO investidor" />
          <ToCItem n="07" t="Nível 3 · CONSTRUTORA (devedora)" />
          <ToCItem n="08" t="Nível 4 · CORRETOR / IMOBILIÁRIA" />
          <ToCItem n="09" t="Nível 5 · COMERCIAL" />
          <ToCItem n="10" t="Modelo financeiro: fórmulas e cálculos" />
          <ToCItem n="11" t="Relatórios e exports" />
          <ToCItem n="12" t="Integrações e stack" />
          <ToCItem n="13" t="Glossário" />
        </View>
      </PageWrapper>

      {/* 01 · VISÃO GERAL */}
      <PageWrapper sectionLabel="01 · visão geral">
        <Text style={styles.eyebrow}>capítulo 01</Text>
        <Text style={styles.h1}>Visão geral da plataforma</Text>

        <Text style={styles.pPlain}>
          A Antecipaqui é uma fintech de antecipação de comissão imobiliária.
          Conecta corretores/imobiliárias que vendem imóveis a fundos
          investidores que compram esse crédito futuro com deságio. A
          construtora (devedora original) paga os boletos no vencimento
          direto pro fundo.
        </Text>

        <Text style={styles.h3}>Quem participa</Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Antecipaqui (AQ)</Text> —
          opera a plataforma. Receita = custos operacionais (100% AQ) +
          metade do spread financeiro.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Corretor / Imobiliária</Text>{" "}
          (cedente) — cede comissão e recebe adiantamento hoje.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Construtora</Text>{" "}
          (devedora) — paga as parcelas no vencimento original.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Fundo</Text>{" "}
          (investidor) — aporta capital. Recebe valor de face nos vencimentos.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Comercial</Text>{" "}
          (time AQ) — carteiriza ops e recebe 10% do lucro líquido AQ.
        </Text>

        <Text style={styles.h3}>Mecânica em três passos</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1 · Cadastro</Text>
          <Text style={styles.p}>
            Corretor cadastra venda + contrato + nota fiscal. Sistema calcula
            valor presente das parcelas e oferece o adiantamento.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2 · Aprovação</Text>
          <Text style={styles.p}>
            Admin verifica docs, vincula a um fundo (ou auto-aprovação por
            regra do fundo), congela taxa, construtora assina ciência da dívida.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3 · Liquidação e cobrança</Text>
          <Text style={styles.p}>
            Fundo paga o adiantamento ao cedente. Em cada vencimento,
            construtora paga o boleto ao fundo (API, CNAB ou manual). AQ
            fatura sua parte via Invoice mensal.
          </Text>
        </View>
      </PageWrapper>

      {/* 02 · PÚBLICAS */}
      <PageWrapper sectionLabel="02 · públicas">
        <Text style={styles.eyebrow}>capítulo 02</Text>
        <Text style={styles.h1}>Páginas públicas</Text>
        <Text style={styles.p}>
          Acessíveis sem login. Apresentação institucional, captação e coleta
          pública de dados.
        </Text>

        <Text style={styles.h2}>Home (/)</Text>
        <Text style={styles.p}>
          Landing principal — hero, proposta de valor, calculadora ilustrativa,
          social proof, CTA pra cadastro.
        </Text>
        <Screenshot shots={shots} nome="publica-home" caption="Home pública — landing institucional" />

        <Text style={styles.h2}>Login (/entrar)</Text>
        <Text style={styles.p}>
          Form gerenciado pelo Clerk. Após auth, redireciona por role.
        </Text>
        <Screenshot shots={shots} nome="publica-entrar" caption="Tela de login Clerk" />

        <Text style={styles.h2}>Como funciona</Text>
        <Screenshot shots={shots} nome="publica-como-funciona" caption="Página /como-funciona" />

        <Text style={styles.h2}>Coleta de comprador (pública via token)</Text>
        <Text style={styles.p}>
          Página gerada por token único válido por 24h. Corretor envia o
          link pelo WhatsApp ou QR; comprador preenche dados (CPF/CNPJ,
          contato, endereço com CEP auto-fill). Dados ficam pendentes no
          painel do corretor.
        </Text>
      </PageWrapper>

      {/* 03 · CONTAS */}
      <PageWrapper sectionLabel="03 · contas">
        <Text style={styles.eyebrow}>capítulo 03</Text>
        <Text style={styles.h1}>Contas de acesso por nível</Text>
        <Text style={styles.p}>
          Contas de teste compartilham a senha padrão{" "}
          <Mono>***REDACTED***</Mono>. Admin e Fundo Critéria têm
          credenciais próprias.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCellHead, { width: "18%" }]}>Nível</Text>
            <Text style={[styles.tableCellHead, { width: "37%" }]}>Email</Text>
            <Text style={[styles.tableCellHead, { width: "18%" }]}>Senha</Text>
            <Text style={[styles.tableCellHead, { width: "27%" }]}>Nome</Text>
          </View>
          {CONTAS.map((c, i) => (
            <View
              key={c.email}
              style={
                i === CONTAS.length - 1 ? styles.tableRowLast : styles.tableRow
              }
            >
              <Text
                style={[
                  i % 2 === 1 ? styles.tableCellAlt : styles.tableCell,
                  { width: "18%", fontFamily: "Helvetica-Bold" },
                ]}
              >
                {c.nivel}
              </Text>
              <Text
                style={[
                  i % 2 === 1 ? styles.tableCellAlt : styles.tableCell,
                  styles.tableCellMono,
                  { width: "37%" },
                ]}
              >
                {c.email}
              </Text>
              <Text
                style={[
                  i % 2 === 1 ? styles.tableCellAlt : styles.tableCell,
                  styles.tableCellMono,
                  { width: "18%" },
                ]}
              >
                {c.senha}
              </Text>
              <Text
                style={[
                  i % 2 === 1 ? styles.tableCellAlt : styles.tableCell,
                  { width: "27%" },
                ]}
              >
                {c.nome}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.cardAccent}>
          <Text style={styles.cardTitle}>Como entrar</Text>
          <Text style={styles.p}>
            1 · <Mono>https://www.antecipaqui.digital/entrar</Mono>
            {"\n"}2 · email + senha{"\n"}3 · sistema redireciona pro painel
            do seu nível
          </Text>
        </View>

        <Text style={styles.h3}>Recuperação de senha</Text>
        <Text style={styles.p}>
          Auth é Clerk. Clique em &ldquo;Esqueci minha senha&rdquo; na tela
          de login. Admin também pode resetar via painel Clerk oficial.
        </Text>
      </PageWrapper>

      {/* 04 · ADMIN */}
      <PageWrapper sectionLabel="04 · admin">
        <Text style={styles.eyebrow}>capítulo 04 · nível 1 — acesso total</Text>
        <Text style={styles.h1}>Painel administrativo</Text>
        <Text style={styles.p}>
          O admin tem acesso a tudo. Aprova operações, vincula fundos,
          configura parâmetros financeiros, decide pendências de antecipação
          e renegociação, gera borderôs, processa CNAB e gerencia todos os
          cadastros.
        </Text>
        <Screenshot shots={shots} nome="admin-painel" caption="Dashboard principal do admin (/admin)" />

        <Text style={styles.h2}>Mesa de decisão (/admin/decidir)</Text>
        <Text style={styles.p}>
          Fila consolidada de operações aguardando decisão. Cada card mostra:
          número, cedente, construtora, valor da comissão, taxa proposta,
          fundo sugerido (se houver auto-roteamento), score da construtora,
          docs anexados, alertas de risco. Ações inline: aprovar (com seleção
          de fundo + taxa final), pedir doc faltando, recusar (com motivo
          obrigatório).
        </Text>
        <Screenshot shots={shots} nome="admin-decidir" caption="Mesa de decisão — ops aguardando aprovação" />

        <Text style={styles.h2}>Operações (/admin/operacoes)</Text>
        <Text style={styles.p}>
          Lista completa com filtros por status, fundo, construtora, período,
          empreendimento. Cada linha tem badge de status, valor, contraparte
          e link pro detalhe (visão 360 com cedente, construtora, fundo,
          parcelas, custos, contrato, timeline, eventos).
        </Text>
        <Screenshot shots={shots} nome="admin-operacoes" caption="Lista de operações" />

        <Text style={styles.h2}>Risco global (/admin/risco-global)</Text>
        <Text style={styles.p}>
          Heatmap de concentração por construtora, fundo e UF. Limites:{" "}
          <Italic>{">"}25% do capital exposto = alerta amarelo</Italic>,{" "}
          <Italic>{">"}40% = crítico vermelho</Italic>. Ranking das devedoras
          mais arriscadas + dos fundos mais concentrados. Útil pra
          rebalancear carteira antes de aprovar novas operações.
        </Text>
        <Screenshot shots={shots} nome="admin-risco-global" caption="Risco global — concentração por construtora/fundo/UF" />

        <Text style={styles.h2}>Pendências de decisão (/admin/pendencias)</Text>
        <Text style={styles.p}>
          Inbox unificado de antecipações e renegociações solicitadas pelas
          construtoras. Antecipação = quitar antes com desconto. Renegociação
          = prorrogar ou dividir em N parcelas novas. Admin aprova ou recusa
          com motivo. Aprovar renegociação aplica a mudança automaticamente
          (troca vencimento ou divide a parcela).
        </Text>
        <Screenshot shots={shots} nome="admin-pendencias" caption="Inbox de antecipações e renegociações" />

        <Text style={styles.h2}>Fundos (/admin/fundos)</Text>
        <Text style={styles.p}>
          Lista todos os fundos cadastrados. Cada um tem razão social, CNPJ,
          taxa-base (custo do dinheiro), modo de cobrança e status. Link pro
          detalhe abre o painel completo: editar dados, custos padrão,
          encargos de atraso, configuração de cobrança (API/CNAB/manual) e
          configuração de assinatura digital (ZapSign padrão ou próprio).
        </Text>
        <Screenshot shots={shots} nome="admin-fundos" caption="Lista de fundos investidores" />

        <Text style={styles.h2}>Configurações (/admin/configuracoes)</Text>
        <Text style={styles.p}>
          Parâmetros financeiros globais: taxa mensal padrão (média dos
          fundos ativos), spread mínimo aceitável por operação, CDI mensal
          (referência), pesos do score automático de construtoras.
        </Text>
        <Screenshot shots={shots} nome="admin-configuracoes" caption="Configurações globais da plataforma" />
      </PageWrapper>

      {/* 04b · ADMIN · CADASTROS + RELATÓRIOS */}
      <PageWrapper sectionLabel="04 · admin · cadastros">
        <Text style={styles.h2}>Cadastros do admin</Text>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCellHead, { width: "32%" }]}>Rota</Text>
            <Text style={[styles.tableCellHead, { width: "68%" }]}>
              O que faz
            </Text>
          </View>
          <Row2
            l="/admin/cadastrar/imobiliaria"
            r="Cria imobiliária + envia convite Clerk ao corretor. Marca KYC pendente até docs subirem."
            mono
          />
          <Row2
            l="/admin/cadastrar/construtora"
            r="Cria construtora (devedora original). Convite opcional ao responsável."
            alt
            mono
          />
          <Row2
            l="/admin/cadastrar/comercial"
            r="Cadastra comercial AQ (PF). Recebe 10% do lucro líquido das ops carteirizadas."
            mono
          />
          <Row2
            l="/admin/fundos/novo"
            r="Cadastro completo do fundo: taxa, custo, impostos, banco, contrato, encargos atraso, modo cobrança, sistema de assinatura."
            alt
            mono
          />
          <Row2
            l="/admin/cadastrar/operacao"
            r="Admin pode cadastrar operação em nome de qualquer corretor."
            mono
          />
        </View>

        <Text style={styles.h2}>Faturamento e ledger</Text>

        <Text style={styles.h3}>Invoice mensal (/admin/faturas)</Text>
        <Text style={styles.p}>
          Fatura AQ ↔ fundo. AQ cobra do fundo proporcional ao valor
          efetivamente pago da operação no mês. Se 30% da comissão foi paga
          em outubro, AQ fatura 30% do <Mono>resultado_op_AQ</Mono> daquela
          op. Tela: cards de KPI, lista de ops com contribuição mês, total
          agregado, export CSV e PDF.
        </Text>

        <Text style={styles.h3}>Comissões (/admin/comerciais/comissoes)</Text>
        <Text style={styles.p}>
          Ledger detalhado. Cada operação que gera resultado cria uma row
          com: comercial, op, spread gerado, lucro líquido (com imposto
          presumido 18%), comissão final (10%). Total por comercial + status
          de pagamento.
        </Text>

        <Text style={styles.h2}>Relatórios</Text>
        <Text style={styles.p}>
          Acessíveis em <Mono>/admin/relatorios</Mono> — índice com cards de
          todos os relatórios disponíveis.
        </Text>
        <Screenshot shots={shots} nome="admin-relatorios" caption="Índice de relatórios" />
        <Screenshot shots={shots} nome="admin-borderos-relatorio" caption="Borderô consolidado com filtros e export CSV/PDF" />
      </PageWrapper>

      {/* 05 · OPERAÇÕES */}
      <PageWrapper sectionLabel="05 · operações">
        <Text style={styles.eyebrow}>capítulo 05</Text>
        <Text style={styles.h1}>Operações — ciclo de vida completo</Text>
        <Text style={styles.p}>
          Operação é o objeto central da plataforma. Representa uma comissão
          imobiliária sendo antecipada. Tem estado bem definido, atores
          específicos e fluxo controlado por máquina de estados.
        </Text>

        <Text style={styles.h2}>Anatomia</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCellHead, { width: "35%" }]}>Campo</Text>
            <Text style={[styles.tableCellHead, { width: "65%" }]}>O que é</Text>
          </View>
          <Row2 l="numero" r="ID público sequencial (ex: OP-2026-0042)" mono />
          <Row2 l="corretor / imobiliária" r="Cedente (quem cadastrou)" alt mono />
          <Row2 l="construtora" r="Devedora original" mono />
          <Row2 l="fundo" r="Investidor (definido na aprovação)" alt mono />
          <Row2 l="comercial" r="Time AQ responsável (10% lucro)" mono />
          <Row2 l="empreendimento" r="(opcional) agrupador da construtora" alt mono />
          <Row2 l="valor_venda" r="Total do imóvel" mono />
          <Row2 l="valor_comissao" r="Face da comissão a antecipar" alt mono />
          <Row2 l="taxa_mensal" r="Taxa de juros da operação (custo do cedente)" mono />
          <Row2 l="taxa_fundo_snapshot" r="Taxa do fundo congelada na aprovação" alt mono />
          <Row2 l="valor_presente / desagio" r="Cálculo VP (cedente recebe VP)" mono />
          <Row2 l="parcelas[]" r="Parcelas com vencimento + valor" alt mono />
          <Row2 l="custos[]" r="Custos operacionais (100% receita AQ)" mono />
          <Row2 l="pagador_tipo" r="construtora | compradores (solidários)" alt mono />
          <Row2 l="cashback_percent" r="(opcional) % devolvido pra construtora" mono />
        </View>

        <Text style={styles.h2}>Máquina de estados</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCellHead, { width: "32%" }]}>Status</Text>
            <Text style={[styles.tableCellHead, { width: "68%" }]}>O que significa</Text>
          </View>
          <Row2 l="rascunho" r="Corretor preenchendo" mono />
          <Row2 l="aguardando_aprovacao" r="Corretor enviou; admin recebeu" alt mono />
          <Row2 l="documentos_incompletos" r="Admin pediu doc faltando" mono />
          <Row2 l="pre_aprovada" r="Admin pré-validou + fundo vinculado + snapshot taxa" alt mono />
          <Row2 l="analise_final" r="Última checagem antes da assinatura" mono />
          <Row2 l="enviada_para_assinatura" r="ZapSign (ou outro) enviou contrato" alt mono />
          <Row2 l="enviada_para_pagamento" r="Cedente assinou. Fundo deposita." mono />
          <Row2 l="realizada" r="Adiantamento pago. Cobrança das parcelas começa." alt mono />
          <Row2 l="recusada / cancelada" r="Terminais (com motivo)" mono />
        </View>

        <Text style={styles.h2}>Eventos paralelos</Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Decisão do fundo:</Text>{" "}
          <Mono>fundo_aprovacao</Mono> ∈ pendente/aprovada/recusada. Pode
          rodar auto por regras configuradas no fundo.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Ciência da construtora:</Text>{" "}
          assina ciência da dívida (registro). Pode recusar com motivo.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Ledger comercial:</Text>{" "}
          row criada quando passa pra <Mono>pre_aprovada</Mono>+. Atualiza
          com taxa final.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Chat:</Text>{" "}
          categorias operacoes/negociacoes/confirmacao/documentos roteiam
          automaticamente.
        </Text>

        <Text style={styles.h2}>Cobrança contínua após realização</Text>
        <Text style={styles.p}>
          Operação <Mono>realizada</Mono> não significa &ldquo;encerrada&rdquo;
          — significa que o adiantamento foi pago. As parcelas seguem sendo
          cobradas:
        </Text>
        <Text style={styles.bullet}>
          • Cron diário cria tickets de lembrete (pré-venc 5-9 dias, atraso ≥1)
        </Text>
        <Text style={styles.bullet}>
          • Multa+juros calculados automaticamente
        </Text>
        <Text style={styles.bullet}>
          • Construtora anexa comprovante por parcela ou em lote
        </Text>
        <Text style={styles.bullet}>
          • Fundo recebe baixa via API (webhook) / CNAB (import) / manual
        </Text>
        <Text style={styles.bullet}>
          • Construtora pode solicitar antecipação ou renegociação
        </Text>
      </PageWrapper>

      {/* 06 · FUNDO */}
      <PageWrapper sectionLabel="06 · fundo">
        <Text style={styles.eyebrow}>capítulo 06 · nível 2 — investidor</Text>
        <Text style={styles.h1}>Painel do fundo</Text>
        <Text style={styles.p}>
          Quem aporta o capital. Decide quais operações financia, monitora
          risco e recebimentos, configura regras de auto-aprovação e seu
          próprio modo de cobrança. Pode integrar via API com sistemas
          próprios.
        </Text>
        <Screenshot shots={shots} nome="fundo-painel" caption="Dashboard do fundo" />

        <Text style={styles.h2}>Mesa de decisão (/painel/aprovar)</Text>
        <Text style={styles.p}>
          Lista operações com <Mono>fundo_aprovacao=pendente</Mono>. Pra cada,
          o fundo vê: detalhes da op, score da construtora, exposição atual,
          taxa proposta vs taxa-base, score histórico do cedente, alertas de
          concentração. Decide: aprovar, recusar com motivo, ou pedir
          ajuste.
        </Text>
        <Screenshot shots={shots} nome="fundo-aprovar" caption="Mesa de decisão do fundo" />

        <Text style={styles.h2}>Regras de auto-aprovação (/painel/regras)</Text>
        <Text style={styles.p}>
          CRUD de regras. Critérios por regra: <Italic>taxa mínima</Italic>,{" "}
          <Italic>prazo máximo (meses)</Italic>,{" "}
          <Italic>valor máximo da comissão</Italic>,{" "}
          <Italic>construtoras allowlist</Italic>,{" "}
          <Italic>prioridade</Italic>. Quando admin vincula uma op ao fundo,
          o sistema avalia as regras em ordem. Se alguma bate, op vai direto
          pra <Mono>aprovada</Mono>. Senão fica <Mono>pendente</Mono> pra
          decisão humana.
        </Text>
        <Screenshot shots={shots} nome="fundo-regras" caption="CRUD de regras de auto-aprovação" />

        <Text style={styles.h2}>Forecast (/painel/forecast)</Text>
        <Text style={styles.p}>
          Projeção 6 meses de recebimentos. Mostra bruto a receber por mês,
          parte do fundo, parte AQ (invoice). Planejamento de caixa.
        </Text>
        <Screenshot shots={shots} nome="fundo-forecast" caption="Forecast 6 meses" />

        <Text style={styles.h2}>Risco (/painel/risco)</Text>
        <Text style={styles.p}>
          Heatmap de concentração por construtora + UF + ranking de devedoras
          com pior performance. <Italic>Blacklist</Italic> de construtoras —
          quando admin tenta vincular op de construtora blacklisted, sistema
          recusa automaticamente.
        </Text>
        <Screenshot shots={shots} nome="fundo-risco" caption="Risco do fundo + blacklist" />

        <Text style={styles.h2}>API externa (/painel/api)</Text>
        <Text style={styles.p}>
          Tokens REST pra integrar com sistemas próprios. Scopes:{" "}
          <Italic>read_only</Italic> ou <Italic>read_write</Italic>. Tokens
          têm prefixo <Mono>aq_</Mono> e <Mono>lastUsedAt</Mono> atualizado
          fire-and-forget.
        </Text>
        <Text style={styles.h3}>Endpoints disponíveis</Text>
        <Text style={styles.bullet}>
          • <Mono>GET /api/external/fundo/me</Mono>
        </Text>
        <Text style={styles.bullet}>
          • <Mono>GET /api/external/fundo/operacoes</Mono>
        </Text>
        <Text style={styles.bullet}>
          • <Mono>GET /api/external/fundo/operacoes/[id]</Mono>
        </Text>
        <Text style={styles.bullet}>
          • <Mono>GET /api/external/fundo/parcelas</Mono>
        </Text>
        <Text style={styles.bullet}>
          • <Mono>POST /api/external/fundo/operacoes/[id]/decisao</Mono> (rw)
        </Text>
        <Screenshot shots={shots} nome="fundo-api" caption="Gestão de tokens API externa" />

        <Text style={styles.h2}>Perfil do fundo (/painel/perfil)</Text>
        <Text style={styles.p}>
          Fundo edita os próprios dados: nome fantasia, contato, endereço,
          banco, contrato modelo, e <Italic>sistema de assinatura digital</Italic>{" "}
          (ZapSign padrão OU sistema próprio do fundo com URL+credenciais).
          Razão social, CNPJ, taxa-base, encargos e modo de cobrança ficam
          admin-only.
        </Text>
        <Screenshot shots={shots} nome="fundo-perfil" caption="Edição de perfil + assinatura digital" />
      </PageWrapper>

      {/* 06b · FUNDO · COBRANÇA */}
      <PageWrapper sectionLabel="06 · fundo · cobrança">
        <Text style={styles.h2}>Modos de cobrança</Text>
        <Text style={styles.p}>
          Cada fundo escolhe (configurado pelo admin) como emite e baixa
          boletos. 3 modos suportados:
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1 · Manual (default)</Text>
          <Text style={styles.p}>
            Admin emite o boleto direto no banco do fundo e marca a parcela
            como paga manualmente. Indicado pra fundos pequenos ou fase
            inicial.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2 · API direta</Text>
          <Text style={styles.p}>
            Fundo expõe API REST pra geração de boletos + webhook pra baixa.
            Plataforma chama o endpoint cadastrado e recebe webhook
            autenticado (HMAC-SHA256 com segredo compartilhado). Auth: API
            Key, HTTP Basic, OAuth 2.0 Client Credentials.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>3 · CNAB (FEBRABAN 240)</Text>
          <Text style={styles.p}>
            Gera arquivo <Mono>.REM</Mono> de remessa com parcelas pendentes
            (header arquivo + header lote + segmentos P/Q + trailers). Admin
            baixa, envia ao banco. Quando banco devolve <Mono>.RET</Mono>,
            admin importa em <Mono>/admin/fundos/[id]/cnab</Mono> e o parser
            identifica liquidações (códigos 06/17/09) e baixa em lote por{" "}
            <Mono>nosso_numero</Mono>.
          </Text>
        </View>

        <Text style={styles.h2}>Encargos de atraso</Text>
        <Text style={styles.p}>
          Cada fundo define percentuais próprios. Defaults: multa 2% + juros
          mora 1%/mês.
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`multa            = valor × multa_atraso_pct      // única
juros_diário     = juros_mora_mensal_pct / 30
juros_mora       = valor × juros_diário × dias_atraso
valor_atualizado = valor + multa + juros_mora`}
          </Text>
        </View>

        <Text style={styles.h2}>Custos padrão por fundo</Text>
        <Text style={styles.p}>
          Fundo cadastra lista de custos padrão (ex:{" "}
          <Italic>análise jurídica R$ 150</Italic>,{" "}
          <Italic>cartório R$ 80</Italic>). Quando admin vincula o fundo a
          uma op, esses custos são <Italic>clonados automaticamente</Italic>{" "}
          pra <Mono>custos_operacao</Mono>. Admin pode adicionar/editar na op
          específica. Idempotente.
        </Text>
      </PageWrapper>

      {/* 07 · CONSTRUTORA */}
      <PageWrapper sectionLabel="07 · construtora">
        <Text style={styles.eyebrow}>capítulo 07 · nível 3 — devedora</Text>
        <Text style={styles.h1}>Painel da construtora</Text>
        <Text style={styles.p}>
          A construtora é quem efetivamente paga as comissões antecipadas no
          vencimento. Tem ferramentas de pagamento (à vista, em lote,
          antecipação, renegociação), gestão financeira (forecast, extrato,
          score) e organização interna (empreendimentos, equipe multi-user).
        </Text>
        <Screenshot shots={shots} nome="construtora-painel" caption="Dashboard da construtora" />

        <Text style={styles.h2}>Duplicatas a pagar (/painel/duplicatas)</Text>
        <Text style={styles.p}>
          Cronograma completo de parcelas. Filtros e recursos:
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Pagamento em lote:</Text>{" "}
          seleciona N parcelas + 1 comprovante (TED batch) → marca todas como
          pagas pendentes de baixa.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Detalhe da parcela</Text>{" "}
          com 3 abas: <Italic>Pagar</Italic> (upload comprovante),{" "}
          <Italic>Antecipar</Italic> (propor desconto),{" "}
          <Italic>Renegociar</Italic> (prorrogar OU dividir em N).
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Recibo</Text> HTML
          imprimível de parcela paga.
        </Text>
        <Screenshot shots={shots} nome="construtora-duplicatas" caption="Duplicatas com filtros e pagamento em lote" />

        <Text style={styles.h2}>Extrato (/painel/extrato)</Text>
        <Text style={styles.p}>
          Visão completa: pagas, a vencer, vencidas. Totais por período.
          Export CSV (BOM UTF-8) e PDF formatado pra contabilidade.
        </Text>
        <Screenshot shots={shots} nome="construtora-extrato" caption="Extrato financeiro com export CSV/PDF" />

        <Text style={styles.h2}>Empreendimentos (/painel/empreendimentos)</Text>
        <Text style={styles.p}>
          CRUD de empreendimentos (torres, condomínios, loteamentos). Cada
          operação pode ser linkada a um empreendimento, permitindo: filtro
          por projeto na listagem, contabilidade separada por torre,
          relatórios agregados.
        </Text>
        <Screenshot shots={shots} nome="construtora-empreendimentos" caption="Cadastro de empreendimentos" />

        <Text style={styles.h2}>Equipe (/painel/equipe)</Text>
        <Text style={styles.p}>
          Owner convida colegas (financeiro, comercial, jurídico, outro).
          Cada convite gera email Clerk com publicMetadata que cria o user
          vinculado no primeiro login. Permissões finas por role interna
          ficam pra próxima sprint — por ora todos veem o painel completo.
        </Text>
        <Screenshot shots={shots} nome="construtora-equipe" caption="Gestão de equipe interna" />

        <Text style={styles.h2}>Outras telas</Text>
        <Text style={styles.bullet}>
          • <Mono>/painel/documentos</Mono> — central com todos os docs
          (KYC + operações). Busca + filtro por tipo.
        </Text>
        <Text style={styles.bullet}>
          • <Mono>/painel/pendencias</Mono> — to-do list de docs solicitados
        </Text>
        <Text style={styles.bullet}>
          • <Mono>/painel/forecast</Mono> — projeção 12 meses do que vai pagar
        </Text>
        <Text style={styles.bullet}>
          • <Mono>/painel/risco</Mono> — concentração por fundo
        </Text>
        <Text style={styles.bullet}>
          • <Mono>/painel/score</Mono> — score próprio + dicas de melhoria
        </Text>
        <Text style={styles.bullet}>
          • <Mono>/painel/cashback</Mono> — saldo e saque de fidelidade
        </Text>
      </PageWrapper>

      {/* 08 · CORRETOR */}
      <PageWrapper sectionLabel="08 · corretor">
        <Text style={styles.eyebrow}>capítulo 08 · nível 4 — cedente</Text>
        <Text style={styles.h1}>Corretor / Imobiliária</Text>
        <Text style={styles.p}>
          Quem traz a operação. View pensada pra velocidade: autosave de
          draft, OCR de contratos, coleta de comprador via QR, autocomplete
          de CNPJ via Receita Federal.
        </Text>
        <Screenshot shots={shots} nome="corretor-painel" caption="Dashboard do corretor" />

        <Text style={styles.h2}>Cadastro de operação (/painel/operacoes/nova)</Text>
        <Text style={styles.p}>
          Form de uma página em 4 seções: 01 construtora, 02 dados da venda,
          03 parcelas (auto-geradas), 04 documentos. Sidebar mostra o valor
          presente recalculado a cada mudança.
        </Text>
        <Screenshot shots={shots} nome="corretor-nova-operacao" caption="Form de nova operação com VP em tempo real" />

        <Text style={styles.h3}>Recursos de velocidade</Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Autosave</Text> no
          localStorage a cada 500ms (TTL 24h, limpa após submit OK).
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Clonar:</Text>{" "}
          botão <Italic>🔁 clonar</Italic> em cada linha cria nova op com
          mesma construtora + valores como base.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>CNPJ auto-fill:</Text>{" "}
          no modal de nova construtora, digitar CNPJ busca razão social +
          nome fantasia na BrasilAPI (Receita Federal, cache 1h).
        </Text>
        <Text style={styles.bullet}>
          • <Text style={{ fontFamily: "Helvetica-Bold" }}>Parcelas auto:</Text>{" "}
          ao informar comissão + nº parcelas + data, gera parcelas iguais.
        </Text>

        <Text style={styles.h2}>Importar contrato (OCR)</Text>
        <Text style={styles.p}>
          Em <Mono>/painel/operacoes/importar</Mono>: upload do PDF/foto do
          contrato → Claude Haiku 4.5 vision extrai valor da venda, comissão,
          data, nº parcelas, razão social e CNPJ. Preview com nível de
          confiança. Botão &ldquo;Aplicar ao form&rdquo; injeta no draft e
          redireciona pro form de cadastro.
        </Text>
        <Screenshot shots={shots} nome="corretor-importar" caption="Importar contrato via OCR Claude vision" />

        <Text style={styles.h2}>Coleta de comprador</Text>
        <Text style={styles.p}>
          Em <Mono>/painel/coleta-comprador</Mono>: gera link único 24h, envia
          via WhatsApp (mensagem pronta) ou QR code. Comprador acessa página
          pública e preenche os próprios dados (com CEP auto-fill). Reduz erro
          de digitação.
        </Text>
        <Screenshot shots={shots} nome="corretor-coleta" caption="Gestão de links de coleta" />

        <Text style={styles.h2}>Análise</Text>
        <Screenshot shots={shots} nome="corretor-simular" caption="Simulador de VP antes de cadastrar" />
        <Screenshot shots={shots} nome="corretor-forecast" caption="Forecast pessoal 6 meses" />
        <Screenshot shots={shots} nome="corretor-relatorio" caption="Relatório com score + calculadora de impostos" />
      </PageWrapper>

      {/* 09 · COMERCIAL */}
      <PageWrapper sectionLabel="09 · comercial">
        <Text style={styles.eyebrow}>capítulo 09 · nível 5</Text>
        <Text style={styles.h1}>Comercial Antecipaqui</Text>
        <Text style={styles.p}>
          Time interno que carteiriza operações. Pode cadastrar em nome de
          corretores e recebe comissão sobre o lucro líquido da AQ.
        </Text>
        <Screenshot shots={shots} nome="comercial-painel" caption="Dashboard do comercial" />
        <Screenshot shots={shots} nome="comercial-operacoes" caption="Operações sob responsabilidade" />

        <Text style={styles.h2}>Comissão</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`lucro_op_AQ = spread / 2              // não inclui custos
lucro_líq   = lucro_op_AQ × 0,82      // 18% imposto
comissao    = lucro_líq × 0,10        // 10% lucro líquido`}
          </Text>
        </View>
        <Text style={styles.p}>
          Cada op que passa pra <Mono>pre_aprovada</Mono>+ gera row no ledger.
          Admin paga em <Mono>/admin/comerciais/comissoes</Mono>.
        </Text>
      </PageWrapper>

      {/* 10 · MODELO FINANCEIRO */}
      <PageWrapper sectionLabel="10 · modelo financeiro">
        <Text style={styles.eyebrow}>capítulo 10</Text>
        <Text style={styles.h1}>Modelo financeiro: fórmulas</Text>
        <Text style={styles.p}>
          Todas <Italic>clamped</Italic> pra nunca gerar valores negativos.
        </Text>

        <Text style={styles.h2}>1 · Valor presente</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`VP_parcela    = valor_bruto / (1 + taxa_mensal)^meses_até_venc
VP_total      = SUM(VP_parcelas)
deságio_total = valor_comissao − VP_total`}
          </Text>
        </View>

        <Text style={styles.h2}>2 · Repartição fundo ↔ AQ</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`custos_op            = SUM(custos_operacao.valor)  // 100% AQ
custo_dinheiro_fundo = juros × min(1, taxa_fundo / taxa_op)
spread               = max(0, juros − custo_dinheiro_fundo)
resultado_op_AQ      = custos + spread / 2
parte_fundo_op       = custo_dinheiro_fundo + spread / 2`}
          </Text>
        </View>

        <Text style={styles.h2}>3 · Invoice mensal AQ ↔ fundo</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`saldo_invoice_mês = resultado_op_AQ × (pago_no_período / valor_comissão)

// filtro: parcelas pagas no período (pago_em),
// não por data de aprovação.`}
          </Text>
        </View>

        <Text style={styles.h2}>4 · Comissão do comercial</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`lucro_op_AQ = spread / 2              // NÃO inclui custos
lucro_líq   = lucro_op_AQ × 0,82      // 18% imposto
comissao    = lucro_líq × 0,10        // 10% lucro líquido`}
          </Text>
        </View>

        <Text style={styles.h2}>5 · Encargos de atraso</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`multa            = valor × multa_atraso_pct
juros_diário     = juros_mora_mensal_pct / 30
juros_mora       = valor × juros_diário × dias_atraso
valor_atualizado = valor + multa + juros_mora`}
          </Text>
        </View>

        <Text style={styles.h2}>6 · Score automático</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`// sem histórico: 50 (neutro)
score = 100
       − min(50, vencidas        × peso_vencida)
       − min(40, vencidas_graves × peso_vencida_grave)

vencida_grave = atraso > dias_grave (default 30 dias)`}
          </Text>
        </View>

        <Text style={styles.h2}>7 · Antecipação solicitada</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {`valor_antecipado = valor_original × (1 − desconto_pct)
// desconto entre 0 e 0.5 (max 50%)`}
          </Text>
        </View>

        <Text style={styles.h2}>8 · Snapshot histórico</Text>
        <Text style={styles.bullet}>
          • <Mono>operacoes.taxa_fundo_snapshot</Mono> — congelada na aprovação
        </Text>
        <Text style={styles.bullet}>
          • Custos travados após 1ª parcela paga (não pode editar)
        </Text>
        <Text style={styles.bullet}>• Cashback congelado quando concedido</Text>
      </PageWrapper>

      {/* 11 · RELATÓRIOS */}
      <PageWrapper sectionLabel="11 · relatórios">
        <Text style={styles.eyebrow}>capítulo 11</Text>
        <Text style={styles.h1}>Relatórios e exports</Text>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCellHead, { width: "30%" }]}>Quem usa</Text>
            <Text style={[styles.tableCellHead, { width: "30%" }]}>Relatório</Text>
            <Text style={[styles.tableCellHead, { width: "40%" }]}>Formatos</Text>
          </View>
          <Row3 l="Admin" m="Borderô consolidado" r="CSV + PDF A4 landscape com filtros" />
          <Row3 l="Admin" m="Borderô por op" r="PDF A4 portrait — cedente, parcelas, custos, banco" alt />
          <Row3 l="Construtora" m="Extrato financeiro" r="CSV (Excel) + PDF" />
          <Row3 l="Admin" m="Invoice mensal" r="CSV + PDF (AQ ↔ fundo)" alt />
          <Row3 l="Admin" m="CNAB remessa" r=".REM (FEBRABAN 240)" />
          <Row3 l="Construtora" m="Recibo de parcela" r="HTML imprimível" alt />
          <Row3 l="Admin" m="Daily de parcelas" r="Tela web com ações" />
          <Row3 l="Admin" m="Rankings" r="Construtora / imob / fundo / comercial" alt />
        </View>

        <Text style={styles.h2}>Notificações automáticas</Text>
        <Text style={styles.bullet}>
          • Email (Resend) — convites, pré-vencimento, atraso, decisões
        </Text>
        <Text style={styles.bullet}>• Push web (VAPID) — em desenvolvimento</Text>
        <Text style={styles.bullet}>• Tickets in-app — chat com roteamento</Text>
        <Text style={styles.bullet}>• SMS (Twilio) — uso pontual</Text>

        <Text style={styles.h2}>Crons</Text>
        <Text style={styles.bullet}>
          • <Mono>/api/cron/cobranca-parcelas</Mono> · 12:00 UTC — lembretes
        </Text>
        <Text style={styles.bullet}>
          • <Mono>/api/cron/auto-nudge-chats</Mono> · 12:30 UTC — cutucar chats
          parados
        </Text>
      </PageWrapper>

      {/* 12 · INTEGRAÇÕES */}
      <PageWrapper sectionLabel="12 · integrações">
        <Text style={styles.eyebrow}>capítulo 12</Text>
        <Text style={styles.h1}>Integrações e stack</Text>

        <Text style={styles.h3}>Stack principal</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCellHead, { width: "35%" }]}>Componente</Text>
            <Text style={[styles.tableCellHead, { width: "65%" }]}>Função</Text>
          </View>
          <Row2 l="Next.js 16 + Turbopack" r="Framework full-stack" mono />
          <Row2 l="React 19" r="UI client + server components" alt mono />
          <Row2 l="Tailwind v4" r="Estilização utility-first" mono />
          <Row2 l="TypeScript" r="Type safety end-to-end" alt mono />
          <Row2 l="Neon (Postgres)" r="Banco serverless" mono />
          <Row2 l="Drizzle ORM 0.45" r="Schema type-safe + migrations" alt mono />
          <Row2 l="Clerk 7" r="Auth + multi-tenant via publicMetadata" mono />
          <Row2 l="Vercel" r="Hospedagem + edge + crons" alt mono />
          <Row2 l="@react-pdf/renderer" r="Borderô, extrato, memorial" mono />
          <Row2 l="Vercel Blob" r="Storage private de uploads" alt mono />
        </View>

        <Text style={styles.h3}>Integrações externas</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCellHead, { width: "30%" }]}>Serviço</Text>
            <Text style={[styles.tableCellHead, { width: "70%" }]}>Uso</Text>
          </View>
          <Row2 l="ZapSign" r="Assinatura digital padrão (R$ 0,50/doc). Fundo pode usar próprio." />
          <Row2 l="Resend" r="Email transacional" alt />
          <Row2 l="Twilio" r="SMS pontual" />
          <Row2 l="BrasilAPI" r="Lookup CNPJ Receita Federal, cache 1h" alt />
          <Row2 l="ViaCEP" r="Auto-fill de endereço pelo CEP" />
          <Row2 l="Anthropic Claude" r="Haiku 4.5 vision — validação + OCR contratos" alt />
          <Row2 l="qrserver.com" r="Geração de QR code (coleta de comprador)" />
        </View>
      </PageWrapper>

      {/* 13 · GLOSSÁRIO */}
      <PageWrapper sectionLabel="13 · glossário">
        <Text style={styles.eyebrow}>capítulo 13</Text>
        <Text style={styles.h1}>Glossário</Text>

        {[
          ["Valor presente (VP)", "Quanto valem hoje as parcelas futuras descontadas pela taxa mensal."],
          ["Deságio", "Diferença entre valor de face da comissão e o VP recebido pelo cedente."],
          ["Spread", "Diferença entre taxa da operação e custo do dinheiro do fundo. 50/50 fundo/AQ."],
          ["Custo do dinheiro do fundo", "Taxa que o fundo paga pra ter capital. Configurada por fundo."],
          ["Snapshot de taxa", "Captura da taxa do fundo na aprovação, congelando o histórico."],
          ["Cedente", "Quem cede a comissão (corretor ou imobiliária)."],
          ["Sacado", "Quem paga o boleto. Em geral construtora; pode ser compradores solidários."],
          ["Borderô", "Documento que detalha a operação — parcelas, VP, deságio, custos."],
          ["CNAB", "Padrão FEBRABAN. .REM = remessa, .RET = retorno do banco."],
          ["Invoice", "Fatura AQ ↔ fundo, proporcional ao % pago da comissão no mês."],
          ["Mesa de decisão", "Fila de ops pra aprovar (admin ou fundo). Pode rodar auto por regra."],
          ["Blacklist", "Bloqueio impositivo de construtora por um fundo."],
          ["Cashback", "% do VP devolvido pra construtora na aprovação final."],
          ["Cutucão", "Mensagem de sistema em chat parado. Manual ou auto (cron diário)."],
        ].map(([t, d]) => (
          <View key={t} style={{ marginBottom: 7 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: FG }}>
              {t}
            </Text>
            <Text style={{ fontSize: 9, color: FG_MUTED, marginTop: 1 }}>{d}</Text>
          </View>
        ))}

        <View style={{ marginTop: 24 }} />
        <Text style={[styles.small, { textAlign: "center" }]}>
          Documento gerado em {dataGeracao} · Antecipaqui
        </Text>
      </PageWrapper>
    </Document>
  );
}
