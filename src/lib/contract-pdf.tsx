/**
 * Contract PDF — generated with @react-pdf/renderer.
 *
 * Letterhead com logo Antecipaqui no topo, cláusulas do contrato
 * preenchidas com dados da operação, blocos de assinatura, e em seguida
 * as páginas de borderô (cronograma com VP/juros por parcela).
 *
 * Cessionária = Antecipaqui (Critéria Capital S/A — dados constantes)
 * Cedente     = Corretor/Imobiliária
 * Dev. Solid. = Construtora
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatBRL } from "./format";

const CESSIONARIA = {
  razaoSocial: "CRITÉRIA CAPITAL S/A",
  endereco: "Avenida Magalhães de Castro, n° 4.800, Conjunto 105 — Jardim Panorama",
  cep: "05676-120",
  cidade: "São Paulo",
  uf: "SP",
  cnpj: "32.708.702/0001-10",
  telefone: "(11) 97204-9004",
  email: "emiliano@criteriacapital.com.br",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 90,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#0c1a2c",
    lineHeight: 1.55,
  },
  pageBordero: {
    paddingTop: 90,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0c1a2c",
  },
  header: {
    position: "absolute",
    top: 28,
    left: 50,
    right: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1pt solid #1c6dd0",
    paddingBottom: 14,
  },
  logoContainer: {
    width: 130,
    height: 38,
  },
  logo: { width: 130, height: 38, objectFit: "contain" },
  headerRight: {
    fontSize: 8,
    color: "#5a6571",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#8b95a1",
    textAlign: "center",
    borderTop: "0.5pt solid #c5cad1",
    paddingTop: 8,
  },
  pageNumber: {
    position: "absolute",
    bottom: 28,
    right: 50,
    fontSize: 8,
    color: "#8b95a1",
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  termoNumero: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 18,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    marginTop: 14,
    marginBottom: 6,
  },
  clausulaTitle: {
    fontFamily: "Helvetica-BoldOblique",
  },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  signatureGrid: {
    marginTop: 50,
    flexDirection: "column",
    alignItems: "center",
    gap: 30,
  },
  signatureBlock: {
    width: "70%",
    alignItems: "center",
  },
  signatureLine: {
    borderBottom: "0.5pt solid #0c1a2c",
    width: "100%",
    height: 16,
    marginBottom: 2,
  },
  signatureLabel: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  signatureRole: {
    fontSize: 8,
    color: "#5a6571",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Borderô styles
  borderoTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
    color: "#1c6dd0",
  },
  borderoSubtitle: {
    fontSize: 9,
    color: "#5a6571",
    marginBottom: 18,
  },
  borderoCard: {
    border: "1pt solid #c5cad1",
    borderRadius: 4,
    padding: 14,
    marginBottom: 12,
  },
  borderoCardTitle: {
    fontSize: 8,
    color: "#5a6571",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  borderoStatsGrid: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  borderoStat: { flex: 1, minWidth: 100 },
  borderoStatLabel: {
    fontSize: 7,
    color: "#5a6571",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  borderoStatValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  table: {
    width: "100%",
    border: "0.5pt solid #c5cad1",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f5f7",
    borderBottom: "0.5pt solid #c5cad1",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #e6e7e9",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableFooter: {
    flexDirection: "row",
    borderTop: "1pt solid #0c1a2c",
    backgroundColor: "#f4f5f7",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
  },
  td: { fontSize: 9 },
  colNum: { width: "8%" },
  colVencimento: { width: "20%" },
  colPrazo: { width: "15%", textAlign: "right" },
  colNominal: { width: "20%", textAlign: "right" },
  colJuros: { width: "17%", textAlign: "right", color: "#b45309" },
  colVP: { width: "20%", textAlign: "right", color: "#1c6dd0" },
});

type ContractData = {
  // Operação
  numero: string; // "OP-2026-0001"
  valorPresente: number;
  valorComissao: number;
  valorVenda: number;
  desagio: number;
  taxaMensal: number;
  numeroParcelas: number;
  dataVenda: string;
  dataAssinatura: Date;
  // Cedente
  cedenteRazaoSocial: string;
  cedenteCnpj: string;
  cedenteEndereco: string | null;
  cedenteCidade: string | null;
  cedenteUf: string | null;
  cedenteCep: string | null;
  cedenteTelefone: string | null;
  cedenteEmail: string;
  cedenteBancoNome: string | null;
  cedenteBancoCodigo: string | null;
  cedenteBancoAgencia: string | null;
  cedenteBancoConta: string | null;
  // Construtora
  construtoraRazaoSocial: string;
  construtoraCnpj: string;
  construtoraEndereco: string | null;
  construtoraCidade: string | null;
  construtoraUf: string | null;
  construtoraTelefone: string | null;
  construtoraEmail: string | null;
  // Parcelas (já com cálculo)
  parcelas: {
    numero: number;
    vencimento: string;
    valorNominal: number;
    juros: number;
    vp: number;
    meses: number;
  }[];
  // Logo URL pra letterhead
  logoUrl: string;
};

function formatDateLong(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}
function formatCnpj(c: string) {
  const d = c.replace(/\D/g, "");
  if (d.length !== 14) return c;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function ExtractTermNumber(numero: string) {
  // OP-2026-0072 → 0072
  const parts = numero.split("-");
  return parts[parts.length - 1] ?? numero;
}

function Header({ logoUrl, numero }: { logoUrl: string; numero: string }) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.logoContainer}>
        <Image src={logoUrl} style={styles.logo} />
      </View>
      <View style={styles.headerRight}>
        <Text>Termo de Cessão</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", color: "#1c6dd0" }}>
          {numero}
        </Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <>
      <Text style={styles.footer} fixed>
        CRITÉRIA CAPITAL S/A · CNPJ 32.708.702/0001-10 · Antecipação de
        comissões imobiliárias
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </>
  );
}

export function ContractDocument({ data }: { data: ContractData }) {
  const termoNumero = ExtractTermNumber(data.numero);
  const cedenteEnderecoLinha = `${data.cedenteEndereco ?? "—"}, ${data.cedenteCidade ?? "—"}/${data.cedenteUf ?? "—"}, CEP ${data.cedenteCep ?? "—"}`;
  const construtoraEnderecoLinha = `${data.construtoraEndereco ?? "—"}, ${data.construtoraCidade ?? "—"}/${data.construtoraUf ?? "—"}`;
  const valorReceberStr = formatBRL(data.valorPresente);

  const totalNominal = data.parcelas.reduce((s, p) => s + p.valorNominal, 0);
  const totalJuros = data.parcelas.reduce((s, p) => s + p.juros, 0);
  const totalVP = data.parcelas.reduce((s, p) => s + p.vp, 0);

  return (
    <Document title={`Contrato ${data.numero}`} author="Antecipaqui">
      {/* PÁGINA 1 — abertura + cláusulas 1, 2, 3 */}
      <Page size="A4" style={styles.page}>
        <Header logoUrl={data.logoUrl} numero={data.numero} />

        <Text style={styles.title}>
          Instrumento Particular de Cessão de Direitos Oriundos de Comissão de
          Corretagem C/C Outras Avenças
        </Text>
        <Text style={styles.termoNumero}>Termo de Cessão Nº [{termoNumero}]</Text>

        <Text style={styles.paragraph}>
          De um lado,{" "}
          <Text style={styles.bold}>{CESSIONARIA.razaoSocial}</Text>, pessoa
          jurídica de direito privado com sede na Cidade de {CESSIONARIA.cidade}
          , Estado de São Paulo, na {CESSIONARIA.endereco} — CEP {CESSIONARIA.cep}
          , inscrita no CNPJ sob número de ordem {CESSIONARIA.cnpj}, neste ato
          representada nos termos de seus atos constitutivos, doravante referida
          simplesmente como <Text style={styles.bold}>CESSIONÁRIA</Text>, e de
          outro lado,{" "}
          <Text style={styles.bold}>{data.cedenteRazaoSocial}</Text>, pessoa
          jurídica de direito privado, inscrita no CNPJ sob número de ordem{" "}
          {formatCnpj(data.cedenteCnpj)}, com sede/residente e domiciliado à{" "}
          {cedenteEnderecoLinha}, neste ato representada nos termos de seus
          atos constitutivos, doravante referida simplesmente como{" "}
          <Text style={styles.bold}>CEDENTE</Text>, e por fim,{" "}
          <Text style={styles.bold}>{data.construtoraRazaoSocial}</Text>,
          pessoa jurídica de direito privado, inscrita no CNPJ sob número de
          ordem {formatCnpj(data.construtoraCnpj)}, com sede à{" "}
          {construtoraEnderecoLinha}, neste ato representada nos termos de seus
          atos constitutivos, doravante referida simplesmente{" "}
          <Text style={styles.bold}>DEVEDORA SOLIDÁRIA</Text>, onde as partes
          devidamente qualificadas, tem entre si justo e acordado celebrar o
          presente Instrumento Particular de Cessão de Créditos c/c Outras
          Avenças, o qual será regido nos termos da Lei 10.406/02 e nas
          seguintes condições:
        </Text>

        <Text style={styles.sectionTitle}>DO OBJETO</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 1ª.</Text> O presente
          instrumento, tem por objeto a cessão, pelo(a) CEDENTE, à CESSIONÁRIA,
          de direito adquirido, líquido, certo e exigível, decorrente de
          comissão de corretagem, oriunda do desenvolvimento da atividade e
          aproximação das partes, pelo CEDENTE, onde, exitosa, foi formalizada
          através de instrumento particular, firmado e finalizado, configurando-se
          como ato jurídico perfeito.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 2ª.</Text> A cessão ora
          realizada, é formalizada em conjunto com as disposições do instrumento
          particular de venda e compra, o qual, uma cópia, ficará fazendo parte
          deste instrumento, dando-lhe lastro e segurança quanto ao direito do
          qual a CESSIONÁRIA se sub-roga de forma plena e total, inclusive
          acerca dos eventuais frutos e acréscimos legais.
        </Text>

        <Text style={styles.sectionTitle}>
          DO PAGAMENTO PELA AQUISIÇÃO DO DIREITO
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 3ª.</Text> O preço de
          aquisição será pago pela CESSIONÁRIA ao(à) CEDENTE, no valor de{" "}
          <Text style={styles.bold}>{valorReceberStr}</Text>, por meio de
          crédito na conta corrente nº{" "}
          <Text style={styles.bold}>{data.cedenteBancoConta ?? "[a preencher]"}</Text>
          , agência{" "}
          <Text style={styles.bold}>{data.cedenteBancoAgencia ?? "[a preencher]"}</Text>{" "}
          do{" "}
          <Text style={styles.bold}>
            {data.cedenteBancoNome ?? "[a preencher]"}
            {data.cedenteBancoCodigo ? ` (${data.cedenteBancoCodigo})` : ""}
          </Text>
          , no prazo de 01 (um) dia, a contar da entrega dos Documentos
          Comprobatórios, pelo CEDENTE, devidamente assinados.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 4ª.</Text> Caso a
          obrigação de pagamento seja da DEVEDORA SOLIDÁRIA, esta se dá por
          ciente e anuente quanto à presente operação de cessão do direito,
          obrigando-se de forma integral ao cumprimento desta, independente do
          resultado final do contrato que lastreia esta cessão; por sua vez,
          caso a obrigação seja de cumprimento de terceiro, caberá ao(à)
          CEDENTE, a comunicação ao devedor da obrigação quanto à presente
          cessão, inclusive indicando e informando à CESSIONÁRIA o e-mail e
          contato para encaminhamento do competente boleto de compensação, sem
          prejuízo, porém, da responsabilidade do(a) CEDENTE e DEVEDORA
          SOLIDÁRIA à quitação da obrigação.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Parágrafo único:</Text> Em caso de Sociedade
          em Conta de Participação, caberá à DEVEDORA SOLIDÁRIA comunicar à
          CESSIONÁRIA, cada Sócio Participante que, por ventura, for incluído,
          assim como, caberá a comunicação daquele das obrigações decorrentes
          deste instrumento, ficando, ele, responsável diretamente pelo
          cumprimento da obrigação caso a DEVEDORA SOLIDÁRIA se torne
          insolvente.
        </Text>

        <Footer />
      </Page>

      {/* PÁGINA 2 — cláusulas 5 a 11 */}
      <Page size="A4" style={styles.page}>
        <Header logoUrl={data.logoUrl} numero={data.numero} />

        <Text style={styles.sectionTitle}>DAS OBRIGAÇÕES DAS PARTES</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 5ª.</Text> Caberá à
          CESSIONÁRIA, o pagamento do valor descrito na cláusula 3ª deste
          instrumento, dentro do prazo ali estabelecido, através de
          transferência bancária, por meio de TED ou PIX, em conta de
          titularidade do CEDENTE ou para terceiros, mediante autorização
          deste.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 6ª.</Text> Caberá ao(à)
          CEDENTE, a realização do envio de todos os documentos oriundos à sua
          qualificação, bem como, à operação originadora do direito ao direito
          oriundo da comissão de corretagem, devidamente assinado por todas as
          partes, dando total e inequívoco lastro à operação.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 7ª.</Text> Caberá ao(à)
          CEDENTE, em cumprimento ao art. 290 da Lei 10.406/02, a comunicação
          do devedor, quanto à presente cessão, no prazo máximo de 48 (quarenta
          e oito) horas, contado da data de assinatura do presente instrumento,
          devendo, ainda, comprovar à CESSIONÁRIA, o envio da competente
          comunicação.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 8ª.</Text> Neste ato,
          assina como DEVEDORA SOLIDÁRIA:{" "}
          <Text style={styles.bold}>{data.construtoraRazaoSocial}</Text>,
          pessoa jurídica de direito privado, inscrita no CNPJ sob número de
          ordem {formatCnpj(data.construtoraCnpj)}, com sede à{" "}
          {construtoraEnderecoLinha}, neste ato representada nos termos de seus
          atos constitutivos, a qual anui e garante a veracidade das
          informações prestadas pelo(a) CEDENTE quanto à existência e validade
          do negócio que originou o direito ora cedido, assim como o valor
          financeiro à ele atribuído, onde, vinculado ao seu objeto social,
          onde, se compromete de forma solidária ao(à) CEDENTE, ao cumprimento
          da obrigação em caso de inadimplência prevista nos termos da cláusula
          12ª deste instrumento, abdicando de forma expressa e total, do
          benefício de ordem previsto no art. 827 e seguintes, da Lei 10.406/02.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 9ª.</Text> Caberá ao(à)
          CEDENTE e/ou à DEVEDORA SOLIDÁRIA, a comunicação à CESSIONÁRIA, de
          eventual impossibilidade de cumprimento da obrigação na data de seu
          vencimento, onde, sendo decorrente de caso fortuito ou força maior,
          devidamente comprovada, não serão aplicados os encargos decorrentes
          da mora, previstos na cláusula 12ª, §2º deste instrumento.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 10ª.</Text> Em caso de não
          pagamento do boleto encaminhado ao devedor da obrigação, descrito no
          instrumento de venda e compra, originador do direito ora cedido, a
          obrigação será satisfeita pelo(a) CEDENTE e/ou DEVEDORA SOLIDÁRIA,
          não sendo oponível, em face à CESSIONÁRIA, qualquer alegação de
          desistência, ação judicial, questionamento quanto ao valor ou até
          mesmo extinção da obrigação por qual motivo for, o qual deverá ser
          adimplido de forma integral e, em caso de ausência de quitação na
          data de vencimento, acrescido dos encargos de mora descritos na
          cláusula 12ª, §2º deste contrato.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 11ª.</Text> Caberá à
          CEDENTE e DEVEDORA SOLIDÁRIA, quando requisitado, a apresentação de
          documentação, mesmo que anteriormente enviada, referente à operação
          que originou o direito aqui cedido.
        </Text>

        <Footer />
      </Page>

      {/* PÁGINA 3 — cláusula 12 com contatos + multa */}
      <Page size="A4" style={styles.page}>
        <Header logoUrl={data.logoUrl} numero={data.numero} />

        <Text style={styles.sectionTitle}>DO INADIMPLEMENTO</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 12ª.</Text> A obrigação
          deverá ser satisfeita por terceiro, ao qual será encaminhado boleto
          em favor da CESSIONÁRIA, em conjunto com a comunicação citada à
          cláusula 7ª deste instrumento, onde, o não pagamento na data aprazada
          ensejará no vencimento automático da obrigação, e possibilidade de
          cobrança dos valores do CEDENTE, vez que beneficiário da operação de
          cessão, assim como pela DEVEDORA SOLIDÁRIA, aos quais, será expedida
          comunicação para quitação da obrigação no prazo máximo de cinco dias,
          contados do recebimento da comunicação, sendo válida aquela
          encaminhada por aplicativo de mensagem, e-mail, carta registrada,
          telegrama e demais meios admitidos.
        </Text>

        <Text style={[styles.paragraph, { marginLeft: 16 }]}>
          <Text style={styles.bold}>§1º.</Text> Toda e qualquer comunicação, em
          especial em caso de inadimplência, quando enviada por aplicativo de
          mensagem ou e-mail, deverá ser encaminhada aos seguintes contatos:
        </Text>

        <View style={{ marginLeft: 30, marginBottom: 10 }}>
          <Text style={{ marginBottom: 4 }}>
            ➢ <Text style={styles.bold}>Se para a CESSIONÁRIA:</Text>{" "}
            Telefone: {CESSIONARIA.telefone} · E-mail: {CESSIONARIA.email}
          </Text>
          <Text style={{ marginBottom: 4 }}>
            ➢ <Text style={styles.bold}>Se para o(a) CEDENTE:</Text>{" "}
            Telefone: {data.cedenteTelefone ?? "[a preencher]"} · E-mail:{" "}
            {data.cedenteEmail}
          </Text>
          <Text style={{ marginBottom: 4 }}>
            ➢ <Text style={styles.bold}>Se para a DEVEDORA SOLIDÁRIA:</Text>{" "}
            Telefone: {data.construtoraTelefone ?? "[a preencher]"} · E-mail:{" "}
            {data.construtoraEmail ?? "[a preencher]"}
          </Text>
        </View>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>§2º.</Text> Em caso de inadimplemento por
          parte do(a) CEDENTE e/ou DEVEDORA SOLIDÁRIA, após comunicação para
          quitação, incidirá sobre o valor devido, multa moratória de 10% (dez
          por cento), assim como juros moratórios de 1% ao mês ou 12% ao ano,
          aplicados <Text style={styles.italic}>pro rata die</Text> e correção
          monetária, aplicando-se o índice do IPCA.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>§3º.</Text> Em caso de necessidade de
          cobrança, será acrescido ao valor, honorários advocatícios calculados
          em 10% sobre o valor atualizado do débito, assim como, em caso de
          necessidade de ação judicial, haverá a cobrança de honorários em 20%,
          calculados, também, sobre o valor atualizado do débito.
        </Text>

        <Text style={styles.sectionTitle}>DAS DISPOSIÇÕES GERAIS</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 13ª.</Text> A presente
          cessão é feita em caráter irrevogável e irretratável, e obriga as
          Partes e seus sucessores a qualquer título.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 14ª.</Text> O presente
          Termo de Cessão será regido e interpretado em conformidade com as
          leis da República Federativa do Brasil.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 15ª.</Text> As partes
          declaram que à presente relação, não são aplicáveis as disposições da
          Lei 8.078/90.
        </Text>

        <Footer />
      </Page>

      {/* PÁGINA 4 — cláusulas 16, 17, 18 + foro + assinaturas */}
      <Page size="A4" style={styles.page}>
        <Header logoUrl={data.logoUrl} numero={data.numero} />

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 16ª.</Text> Neste ato,
          o(a) CEDENTE e DEVEDORA SOLIDÁRIA, declaram que, o valor descrito no
          presente instrumento, devido à CESSIONÁRIO e do qual, se inadimplido
          pelo devedor originário, será arcado por aqueles, constituí dívida
          líquida, certa e exigível, nos termos do art. 784, inciso III da Lei
          13.105/15, constituindo título executivo extrajudicial.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Parágrafo único:</Text> Em caso de
          inadimplemento por parte do(a) CEDENTE e/ou DEVEDORA SOLIDÁRIA,
          poderá, a CESSIONÁRIA, realizar a negativação do nome destes, assim
          como, o protesto deste título, sem necessidade de prévia comunicação,
          a qual não poderá ser utilizada como justificativa para
          descumprimento da obrigação ou até mesmo para obtenção de qualquer
          vantagem, declarando, as partes, estarem cientes de todos os termos e
          obrigações e das penalidades decorrentes do descumprimento destas.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 17ª.</Text> As partes
          declaram que leram o presente instrumento, em nada se opondo quanto
          seu conteúdo ou forma, bem como, poderão optar pela assinatura de
          forma eletrônica, nos termos da Lei 14.063/20, valendo-se dos
          assinadores certificados e dando por firme e valiosas as assinaturas
          opostas, reconhecendo-as como expressão de aceitação dos termos do
          presente contrato, comprometendo-se ao seu fiel e total cumprimento.
        </Text>

        <Text style={styles.sectionTitle}>DO FORO</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.clausulaTitle}>Cláusula 18ª.</Text> As Partes
          elegem o foro Central da Capital do Estado de São Paulo, renunciando
          a qualquer outro, por mais privilegiado que seja ou se torne, para
          dirimir qualquer controvérsia oriunda do presente Termo de Cessão,
          cabendo à parte vencida em demanda judicial pagar os honorários de
          advogados da parte vencedora na importância fixada na respectiva
          sentença condenatória.
        </Text>

        <Text style={styles.paragraph}>
          E, por estarem assim justas e contratadas, as Partes firmam o
          presente Termo de Cessão em tantas vias quantas forem as partes
          signatárias vias de igual teor e forma, na presença das 2 (duas)
          testemunhas a seguir assinadas.
        </Text>

        <Text style={[styles.paragraph, { textAlign: "center", marginTop: 14 }]}>
          {CESSIONARIA.cidade}, {formatDateLong(data.dataAssinatura)}.
        </Text>

        <View style={styles.signatureGrid}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{CESSIONARIA.razaoSocial}</Text>
            <Text style={styles.signatureRole}>— CESSIONÁRIA —</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{data.cedenteRazaoSocial}</Text>
            <Text style={styles.signatureRole}>— CEDENTE —</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              {data.construtoraRazaoSocial}
            </Text>
            <Text style={styles.signatureRole}>— DEVEDORA SOLIDÁRIA —</Text>
          </View>
        </View>

        <Footer />
      </Page>

      {/* PÁGINAS BORDERÔ — cronograma com VP/juros por parcela */}
      <Page size="A4" style={styles.pageBordero}>
        <Header logoUrl={data.logoUrl} numero={data.numero} />

        <Text style={styles.borderoTitle}>
          ANEXO · BORDERÔ DA OPERAÇÃO {data.numero}
        </Text>
        <Text style={styles.borderoSubtitle}>
          Cronograma de parcelas com cálculo de valor presente individual.
          Taxa contratada: {(data.taxaMensal * 100).toFixed(2)}% ao mês.
        </Text>

        <View style={styles.borderoCard}>
          <Text style={styles.borderoCardTitle}>Identificação</Text>
          <View style={styles.borderoStatsGrid}>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Cedente</Text>
              <Text style={styles.borderoStatValue}>
                {data.cedenteRazaoSocial}
              </Text>
            </View>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Devedora solidária</Text>
              <Text style={styles.borderoStatValue}>
                {data.construtoraRazaoSocial}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.borderoCard}>
          <Text style={styles.borderoCardTitle}>Resumo financeiro</Text>
          <View style={styles.borderoStatsGrid}>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Valor da venda</Text>
              <Text style={styles.borderoStatValue}>
                {formatBRL(data.valorVenda)}
              </Text>
            </View>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Comissão</Text>
              <Text style={styles.borderoStatValue}>
                {formatBRL(data.valorComissao)}
              </Text>
            </View>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Valor presente (a pagar)</Text>
              <Text style={[styles.borderoStatValue, { color: "#1c6dd0" }]}>
                {formatBRL(data.valorPresente)}
              </Text>
            </View>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Deságio total</Text>
              <Text style={[styles.borderoStatValue, { color: "#b45309" }]}>
                {formatBRL(data.desagio)}
              </Text>
            </View>
          </View>
          <View style={[styles.borderoStatsGrid, { marginTop: 8 }]}>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Data da venda</Text>
              <Text style={styles.borderoStatValue}>
                {formatDate(data.dataVenda)}
              </Text>
            </View>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Parcelas</Text>
              <Text style={styles.borderoStatValue}>
                {data.numeroParcelas}x
              </Text>
            </View>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>Taxa</Text>
              <Text style={styles.borderoStatValue}>
                {(data.taxaMensal * 100).toFixed(2)}% a.m.
              </Text>
            </View>
            <View style={styles.borderoStat}>
              <Text style={styles.borderoStatLabel}>% deságio</Text>
              <Text style={styles.borderoStatValue}>
                {((data.desagio / data.valorComissao) * 100).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.borderoCard}>
          <Text style={styles.borderoCardTitle}>
            Parcelas da comissão · cálculo de juros individual
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.td, styles.colNum]}>Nº</Text>
              <Text style={[styles.td, styles.colVencimento]}>Vencimento</Text>
              <Text style={[styles.td, styles.colPrazo]}>Prazo</Text>
              <Text style={[styles.td, styles.colNominal]}>Nominal</Text>
              <Text style={[styles.td, styles.colJuros]}>Juros</Text>
              <Text style={[styles.td, styles.colVP]}>Valor presente</Text>
            </View>
            {data.parcelas.map((p) => (
              <View style={styles.tableRow} key={p.numero}>
                <Text style={[styles.td, styles.colNum]}>
                  {String(p.numero).padStart(2, "0")}
                </Text>
                <Text style={[styles.td, styles.colVencimento]}>
                  {formatDate(p.vencimento)}
                </Text>
                <Text style={[styles.td, styles.colPrazo]}>
                  {p.meses.toFixed(1)}m
                </Text>
                <Text style={[styles.td, styles.colNominal]}>
                  {formatBRL(p.valorNominal)}
                </Text>
                <Text style={[styles.td, styles.colJuros]}>
                  − {formatBRL(p.juros)}
                </Text>
                <Text style={[styles.td, styles.colVP]}>
                  {formatBRL(p.vp)}
                </Text>
              </View>
            ))}
            <View style={styles.tableFooter}>
              <Text style={[styles.td, styles.colNum]}> </Text>
              <Text style={[styles.td, styles.colVencimento]}>Totais</Text>
              <Text style={[styles.td, styles.colPrazo]}> </Text>
              <Text style={[styles.td, styles.colNominal]}>
                {formatBRL(totalNominal)}
              </Text>
              <Text style={[styles.td, styles.colJuros]}>
                − {formatBRL(totalJuros)}
              </Text>
              <Text style={[styles.td, styles.colVP]}>
                {formatBRL(totalVP)}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={{
            marginTop: 16,
            fontSize: 8,
            color: "#5a6571",
            textAlign: "center",
          }}
        >
          Cálculo de valor presente por juros compostos mensais. Documento
          gerado pela plataforma Antecipaqui em{" "}
          {formatDateLong(data.dataAssinatura)} ·{" "}
          {data.dataAssinatura.toLocaleTimeString("pt-BR")}.
        </Text>

        <Footer />
      </Page>
    </Document>
  );
}

export type { ContractData };
