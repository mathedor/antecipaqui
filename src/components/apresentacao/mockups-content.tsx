/** Conteúdo dos mockups — telas do app desenhadas em CSS.
 *  Cada componente representa uma tela específica do sistema. */

/* ============ MOBILE ============ */

export function MobileNovaOp() {
  return (
    <div className="px-4 pt-3 pb-4 text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[#1c6dd0] text-[9px]">←</div>
        <div className="font-bold text-[11px] text-slate-900">Nova operação</div>
        <div className="w-3" />
      </div>
      {/* Progress */}
      <div className="flex gap-1 mb-3">
        <div className="h-1 flex-1 rounded-full bg-[#1c6dd0]" />
        <div className="h-1 flex-1 rounded-full bg-[#1c6dd0]" />
        <div className="h-1 flex-1 rounded-full bg-slate-200" />
        <div className="h-1 flex-1 rounded-full bg-slate-200" />
      </div>
      <div className="text-[8px] text-slate-500 mb-3 uppercase tracking-wider font-mono">
        Passo 2 de 4 · Comissão
      </div>

      {/* Field — Valor */}
      <div className="mb-3">
        <div className="text-[8px] text-slate-500 mb-1 uppercase tracking-wider font-mono">
          Valor da comissão
        </div>
        <div className="border-2 border-[#1c6dd0] rounded-lg px-3 py-2.5 bg-blue-50">
          <div className="text-[15px] font-bold text-slate-900">R$ 80.000,00</div>
        </div>
      </div>

      {/* Field — Parcelas */}
      <div className="mb-3">
        <div className="text-[8px] text-slate-500 mb-1 uppercase tracking-wider font-mono">
          Quantas parcelas?
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-7 rounded-md flex items-center justify-center text-[10px] font-semibold ${
                n === 3
                  ? "bg-[#1c6dd0] text-white"
                  : "border border-slate-200 text-slate-600"
              }`}
            >
              {n}x
            </div>
          ))}
        </div>
      </div>

      {/* Resultado em destaque */}
      <div className="rounded-xl bg-gradient-to-br from-[#1c6dd0] to-[#0d4e9e] p-3 text-white mb-3">
        <div className="text-[8px] uppercase tracking-wider opacity-80 mb-1">
          Você recebe hoje
        </div>
        <div className="text-[18px] font-bold leading-tight">R$ 71.337,80</div>
        <div className="text-[9px] opacity-90 mt-1">em até 1 dia útil</div>
      </div>

      {/* CTA */}
      <div className="bg-[#1c6dd0] rounded-lg h-8 flex items-center justify-center text-white text-[10px] font-bold">
        Continuar →
      </div>

      {/* Hint */}
      <div className="text-[7px] text-slate-400 text-center mt-2 leading-snug">
        Tá com pressa? <strong className="text-[#1c6dd0]">Clone</strong> de uma op antiga em 1 toque.
      </div>
    </div>
  );
}

export function MobileMinhasOps() {
  return (
    <div className="px-4 pt-3 pb-4 text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-[12px] text-slate-900">Operações</div>
        <div className="w-6 h-6 rounded-full bg-[#1c6dd0] flex items-center justify-center text-white text-sm font-bold">
          +
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 text-[9px]">
        <div className="px-2.5 py-1 rounded-full bg-[#1c6dd0] text-white font-semibold">
          Todas
        </div>
        <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          Aprovadas
        </div>
        <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          Pagas
        </div>
      </div>

      {/* Cards */}
      {[
        {
          num: "AQ-2026-128",
          valor: "R$ 80.000",
          status: "Aprovada",
          cor: "#15803d",
          bg: "#dcfce7",
          data: "ontem",
        },
        {
          num: "AQ-2026-127",
          valor: "R$ 45.000",
          status: "Em análise",
          cor: "#a16207",
          bg: "#fef3c7",
          data: "2 dias",
        },
        {
          num: "AQ-2026-126",
          valor: "R$ 120.000",
          status: "Paga",
          cor: "#1c6dd0",
          bg: "#dbeafe",
          data: "5 dias",
        },
        {
          num: "AQ-2026-125",
          valor: "R$ 65.000",
          status: "Paga",
          cor: "#1c6dd0",
          bg: "#dbeafe",
          data: "1 sem",
        },
      ].map((op) => (
        <div
          key={op.num}
          className="border border-slate-200 rounded-lg p-2.5 mb-2 bg-white"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="font-mono text-[9px] text-slate-500">{op.num}</div>
            <div
              className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
              style={{ color: op.cor, background: op.bg }}
            >
              {op.status}
            </div>
          </div>
          <div className="text-[13px] font-bold text-slate-900">{op.valor}</div>
          <div className="text-[8px] text-slate-400 mt-0.5">há {op.data}</div>
        </div>
      ))}
    </div>
  );
}

export function MobileOcrContrato() {
  return (
    <div className="px-4 pt-3 pb-4 text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[#1c6dd0] text-[9px]">←</div>
        <div className="font-bold text-[11px] text-slate-900">Contrato</div>
        <div className="w-3" />
      </div>

      {/* Card explicativo */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-3">
        <div className="text-[18px] mb-1">📄✨</div>
        <div className="font-bold text-[11px] text-slate-900 mb-1">
          Leia o contrato pra você
        </div>
        <div className="text-[9px] text-slate-600 leading-snug">
          Tira foto ou anexa PDF. Em segundos preenchemos comprador, valor,
          parcelas. Você só confere.
        </div>
      </div>

      {/* Upload area */}
      <div className="border-2 border-dashed border-[#1c6dd0] rounded-xl p-4 text-center bg-white mb-3">
        <div className="text-[28px] mb-1">📷</div>
        <div className="text-[10px] font-semibold text-[#1c6dd0]">
          Fotografar contrato
        </div>
        <div className="text-[8px] text-slate-400 mt-1">ou anexar PDF</div>
      </div>

      {/* Fake extracted */}
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 mb-1.5">
        <div className="text-[7px] uppercase tracking-wider text-slate-400 mb-0.5">
          Comprador (lido automático)
        </div>
        <div className="text-[10px] font-semibold text-slate-900">
          João da Silva · CPF 123.***
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
        <div className="text-[7px] uppercase tracking-wider text-slate-400 mb-0.5">
          Valor de venda
        </div>
        <div className="text-[10px] font-semibold text-slate-900">
          R$ 480.000,00
        </div>
      </div>

      <div className="bg-[#1c6dd0] rounded-lg h-8 mt-3 flex items-center justify-center text-white text-[10px] font-bold">
        ✓ Está correto, continuar
      </div>
    </div>
  );
}

export function MobileDaily() {
  return (
    <div className="px-4 pt-3 pb-4 text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-[12px] text-slate-900">Minha agenda</div>
        <div className="text-[9px] text-slate-500">hoje</div>
      </div>

      {/* Resumo do dia */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 text-white mb-3">
        <div className="text-[8px] uppercase tracking-wider opacity-80 mb-1">
          A receber este mês
        </div>
        <div className="text-[20px] font-bold leading-tight">R$ 32.450</div>
        <div className="text-[9px] opacity-90 mt-1">5 operações ativas</div>
      </div>

      {/* Lista */}
      <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-2">
        Próximos recebimentos
      </div>
      {[
        { dia: "12", mes: "mai", valor: "R$ 6.500", op: "AQ-128 · parcela 1/3" },
        { dia: "20", mes: "mai", valor: "R$ 8.200", op: "AQ-125 · parcela 2/4" },
        { dia: "28", mes: "mai", valor: "R$ 4.100", op: "AQ-127 · parcela 3/3" },
      ].map((p, i) => (
        <div
          key={i}
          className="flex items-center gap-2 mb-2 p-2 rounded-lg border border-slate-100 bg-white"
        >
          <div className="w-9 text-center">
            <div className="text-[14px] font-bold text-[#1c6dd0] leading-none">
              {p.dia}
            </div>
            <div className="text-[7px] text-slate-400 uppercase tracking-wider">
              {p.mes}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-slate-900">
              {p.valor}
            </div>
            <div className="text-[8px] text-slate-500 truncate">{p.op}</div>
          </div>
          <div className="text-[8px] text-emerald-600 font-bold">✓</div>
        </div>
      ))}
    </div>
  );
}

/* ============ DESKTOP ============ */

export function DesktopPainel() {
  return (
    <div className="w-full h-full bg-[#f8fafc] flex">
      {/* Sidebar */}
      <div className="w-44 h-full bg-white border-r border-slate-200 p-3 text-[9px]">
        <div className="font-bold text-[12px] text-[#1c6dd0] mb-4 px-1">
          Antecipaqui
        </div>
        <div className="space-y-1">
          <div className="px-2 py-1.5 rounded bg-blue-50 text-[#1c6dd0] font-semibold">
            🏠 Painel
          </div>
          <div className="px-2 py-1.5 text-slate-600">📋 Operações</div>
          <div className="px-2 py-1.5 text-slate-600">➕ Nova operação</div>
          <div className="px-2 py-1.5 text-slate-600">📅 Daily</div>
          <div className="px-2 py-1.5 text-slate-600">💰 Recebimentos</div>
          <div className="px-2 py-1.5 text-slate-600">📊 Relatório</div>
          <div className="px-2 py-1.5 text-slate-600">💬 Chats</div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 h-full p-5 overflow-hidden">
        <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-1">
          painel · corretor
        </div>
        <div className="text-[16px] font-bold text-slate-900 mb-4">
          Olá, Carlos!
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { l: "Hoje", v: "R$ 80k", c: "#1c6dd0" },
            { l: "Em análise", v: "2", c: "#a16207" },
            { l: "Aprovadas", v: "8", c: "#15803d" },
            { l: "A receber", v: "R$ 32k", c: "#0f172a" },
          ].map((k, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-lg p-2.5 bg-white"
            >
              <div className="text-[7px] uppercase tracking-wider text-slate-500 mb-0.5">
                {k.l}
              </div>
              <div
                className="text-[14px] font-bold"
                style={{ color: k.c }}
              >
                {k.v}
              </div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] font-bold text-slate-900">
              Operações nos últimos 90 dias
            </div>
            <div className="text-[8px] text-slate-400">↑ +23% vs mês passado</div>
          </div>
          {/* Fake chart */}
          <div className="flex items-end gap-1 h-16 mb-2">
            {[30, 45, 38, 52, 48, 55, 62, 58, 70, 65, 78, 72, 85, 80, 88].map(
              (h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-[#1c6dd0] to-[#60a5fa] rounded-sm"
                  style={{ height: `${h}%` }}
                />
              ),
            )}
          </div>
          <div className="flex justify-between text-[7px] text-slate-400 font-mono">
            <span>fev</span>
            <span>mar</span>
            <span>abr</span>
            <span>mai</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesktopRelatorio() {
  return (
    <div className="w-full h-full bg-[#f8fafc] p-5 overflow-hidden">
      <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-1">
        relatório · corretor
      </div>
      <div className="text-[16px] font-bold text-slate-900 mb-3">
        Seu desempenho
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { l: "Comissão antecipada", v: "R$ 380.000", sub: "12 meses" },
          { l: "Economia em juros", v: "R$ 28.450", sub: "vs banco" },
          { l: "Sua nota", v: "92/100", sub: "score corretor" },
        ].map((k, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-xl p-3 bg-white"
          >
            <div className="text-[8px] uppercase tracking-wider text-slate-500 mb-1 font-mono">
              {k.l}
            </div>
            <div className="text-[18px] font-bold text-slate-900">{k.v}</div>
            <div className="text-[8px] text-slate-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-slate-200 rounded-xl p-3 bg-white">
          <div className="text-[9px] font-bold text-slate-900 mb-2">
            Ranking · sua construtora preferida
          </div>
          {[
            { nome: "Construtora Solar", v: "62%", w: "62%" },
            { nome: "MRV", v: "21%", w: "21%" },
            { nome: "Direcional", v: "17%", w: "17%" },
          ].map((r) => (
            <div key={r.nome} className="mb-1.5">
              <div className="flex justify-between text-[8px] mb-0.5">
                <span className="text-slate-700">{r.nome}</span>
                <span className="text-slate-500 font-mono">{r.v}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1c6dd0]"
                  style={{ width: r.w }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-xl p-3 bg-white">
          <div className="text-[9px] font-bold text-slate-900 mb-2">
            Calculadora de imposto
          </div>
          <div className="text-[8px] text-slate-500 mb-1.5">
            Quanto sobra na sua mão?
          </div>
          <div className="bg-slate-50 rounded-md p-2 mb-1.5">
            <div className="text-[7px] text-slate-500 uppercase tracking-wider font-mono mb-0.5">
              Antecipado
            </div>
            <div className="text-[11px] font-bold text-slate-900">
              R$ 71.337
            </div>
          </div>
          <div className="bg-emerald-50 rounded-md p-2 border border-emerald-200">
            <div className="text-[7px] text-emerald-600 uppercase tracking-wider font-mono mb-0.5">
              Líquido após IR
            </div>
            <div className="text-[11px] font-bold text-emerald-700">
              R$ 65.230
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ DESKTOP — FUNDO ============ */

export function DesktopMesaFundo() {
  return (
    <div className="w-full h-full bg-[#f8fafc] flex">
      {/* Sidebar */}
      <div className="w-44 h-full bg-white border-r border-slate-200 p-3 text-[9px]">
        <div className="font-bold text-[12px] text-[#1c6dd0] mb-4 px-1">
          Antecipaqui · Fundo
        </div>
        <div className="space-y-1">
          <div className="px-2 py-1.5 rounded bg-blue-50 text-[#1c6dd0] font-semibold">
            ⚖️ Aprovar
          </div>
          <div className="px-2 py-1.5 text-slate-600">📋 Operações</div>
          <div className="px-2 py-1.5 text-slate-600">📅 Daily</div>
          <div className="px-2 py-1.5 text-slate-600">💰 Recebimentos</div>
          <div className="px-2 py-1.5 text-slate-600">📈 Projeção</div>
          <div className="px-2 py-1.5 text-slate-600">⚙️ Regras</div>
          <div className="px-2 py-1.5 text-slate-600">🔌 API</div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 h-full p-5 overflow-hidden">
        <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-1">
          mesa de decisão · fundo
        </div>
        <div className="text-[16px] font-bold text-slate-900 mb-3">
          5 operações aguardando você
        </div>

        {/* Cards de op pra aprovar */}
        <div className="space-y-1.5">
          {[
            {
              num: "AQ-2026-201",
              valor: "R$ 142.000",
              const: "Solar Construtora",
              score: 92,
              taxa: "6,2%",
              tone: "success",
            },
            {
              num: "AQ-2026-202",
              valor: "R$ 80.000",
              const: "MRV Engenharia",
              score: 88,
              taxa: "6,0%",
              tone: "success",
            },
            {
              num: "AQ-2026-203",
              valor: "R$ 240.000",
              const: "Direcional",
              score: 75,
              taxa: "6,8%",
              tone: "warn",
            },
            {
              num: "AQ-2026-204",
              valor: "R$ 65.000",
              const: "Capricórnio",
              score: 58,
              taxa: "7,5%",
              tone: "warn",
            },
          ].map((op) => {
            const scoreCor =
              op.tone === "success"
                ? "#15803d"
                : op.tone === "warn"
                  ? "#a16207"
                  : "#1c6dd0";
            const scoreBg =
              op.tone === "success"
                ? "#dcfce7"
                : op.tone === "warn"
                  ? "#fef3c7"
                  : "#dbeafe";
            return (
              <div
                key={op.num}
                className="border border-slate-200 rounded-lg p-2 bg-white flex items-center gap-2"
              >
                <div
                  className="px-2 py-1 rounded text-[10px] font-bold"
                  style={{ background: scoreBg, color: scoreCor }}
                >
                  {op.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[8px] text-slate-500">
                    {op.num}
                  </div>
                  <div className="text-[10px] font-bold text-slate-900 truncate">
                    {op.const}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-900">
                    {op.valor}
                  </div>
                  <div className="text-[8px] text-slate-500 font-mono">
                    {op.taxa} a.m.
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-bold">
                    ✓
                  </div>
                  <div className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[8px] font-bold">
                    ✕
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-[8px] text-slate-500 font-mono">
          ⚡ Auto-aprovação ativa em 12 regras · 3 ops aprovadas hoje
        </div>
      </div>
    </div>
  );
}

export function DesktopFundoDashboard() {
  return (
    <div className="w-full h-full bg-[#f8fafc] p-5 overflow-hidden">
      <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-1">
        painel · fundo investidor
      </div>
      <div className="text-[16px] font-bold text-slate-900 mb-4">
        Sua carteira em tempo real
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { l: "Capital exposto", v: "R$ 2.4M", c: "#1c6dd0" },
          { l: "Operações ativas", v: "62", c: "#0f172a" },
          { l: "Rentabilidade m.", v: "+5,8%", c: "#15803d" },
          { l: "Inadimplência", v: "1,2%", c: "#a16207" },
        ].map((k, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-lg p-2.5 bg-white"
          >
            <div className="text-[7px] uppercase tracking-wider text-slate-500 mb-0.5 font-mono">
              {k.l}
            </div>
            <div className="text-[14px] font-bold" style={{ color: k.c }}>
              {k.v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="text-[9px] font-bold text-slate-900 mb-2">
            Carteira por construtora
          </div>
          {[
            { nome: "Solar Construtora", v: "32%" },
            { nome: "MRV Engenharia", v: "24%" },
            { nome: "Direcional", v: "21%" },
            { nome: "Outras (8)", v: "23%" },
          ].map((r) => (
            <div key={r.nome} className="mb-1">
              <div className="flex justify-between text-[8px] mb-0.5">
                <span className="text-slate-700">{r.nome}</span>
                <span className="text-slate-500 font-mono">{r.v}</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1c6dd0]"
                  style={{ width: r.v }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="text-[9px] font-bold text-slate-900 mb-2">
            Recebimentos próximos 30d
          </div>
          <div className="flex items-end gap-1 h-12 mb-2">
            {[20, 35, 28, 45, 38, 52, 48, 55, 60, 58, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-[#1c6dd0] to-[#60a5fa] rounded-sm"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="text-[10px] font-bold text-slate-900">
            R$ 380.000 previstos
          </div>
          <div className="text-[7px] text-slate-500">142 parcelas</div>
        </div>
      </div>

      <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-2.5">
        <div className="text-[9px] font-bold text-emerald-700 mb-0.5">
          ✓ 3 ops aprovadas automaticamente nas últimas 24h
        </div>
        <div className="text-[8px] text-emerald-600">
          Score ≥ 85 · taxa ≥ 6% · construtora pré-aprovada
        </div>
      </div>
    </div>
  );
}

export function DesktopFundoApi() {
  return (
    <div className="w-full h-full bg-[#0f172a] p-5 overflow-hidden text-white font-mono">
      <div className="text-[8px] uppercase tracking-wider text-blue-300 mb-1">
        integração · webhooks + api
      </div>
      <div className="text-[16px] font-bold text-white mb-4 font-sans">
        Plugue no seu sistema
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* API endpoint */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[8px] text-emerald-300 font-bold mb-1">
            GET /api/external/fundo/operacoes
          </div>
          <div className="text-[7px] text-slate-400 mb-1.5">
            Authorization: Bearer aq_...
          </div>
          <pre className="text-[7px] text-slate-300 leading-snug">{`{
  "operacoes": [
    {
      "numero": "AQ-2026-201",
      "valorPresente": 71337,
      "construtora": "Solar",
      "score": 92
    }
  ]
}`}</pre>
        </div>

        {/* Webhook */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[8px] text-blue-300 font-bold mb-1">
            POST /seu-endpoint
          </div>
          <div className="text-[7px] text-slate-400 mb-1.5">
            x-antecipaqui-signature: sha256=...
          </div>
          <pre className="text-[7px] text-slate-300 leading-snug">{`{
  "evento": "op_aprovada",
  "operacaoId": "uuid",
  "valor": 142000,
  "construtora": "Solar"
}`}</pre>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { l: "Webhooks", v: "HMAC-SHA256" },
          { l: "Eventos", v: "7 tipos" },
          { l: "Retry", v: "4 tentativas" },
        ].map((b) => (
          <div
            key={b.l}
            className="border border-slate-700 rounded-lg p-2 bg-slate-900"
          >
            <div className="text-[7px] text-slate-400 uppercase tracking-wider mb-0.5">
              {b.l}
            </div>
            <div className="text-[10px] font-bold text-white font-sans">
              {b.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ DESKTOP — CONSTRUTORA ============ */

export function DesktopConstrutoraPainel() {
  return (
    <div className="w-full h-full bg-[#f8fafc] flex">
      {/* Sidebar */}
      <div className="w-44 h-full bg-white border-r border-slate-200 p-3 text-[9px]">
        <div className="font-bold text-[12px] text-[#1c6dd0] mb-4 px-1">
          Antecipaqui
        </div>
        <div className="space-y-1">
          <div className="px-2 py-1.5 rounded bg-blue-50 text-[#1c6dd0] font-semibold">
            🏠 Painel
          </div>
          <div className="px-2 py-1.5 text-slate-600">🏗 Empreendimentos</div>
          <div className="px-2 py-1.5 text-slate-600">💼 Duplicatas</div>
          <div className="px-2 py-1.5 text-slate-600">💰 Cashback</div>
          <div className="px-2 py-1.5 text-slate-600">📋 Operações</div>
          <div className="px-2 py-1.5 text-slate-600">📊 Forecast</div>
          <div className="px-2 py-1.5 text-slate-600">🎯 Score</div>
          <div className="px-2 py-1.5 text-slate-600">👥 Equipe</div>
        </div>
      </div>

      <div className="flex-1 h-full p-5 overflow-hidden">
        <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-1">
          construtora · visão financeira
        </div>
        <div className="text-[16px] font-bold text-slate-900 mb-3">
          Construtora Solar — caixa unificado
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { l: "Saldo a pagar", v: "R$ 1.8M", sub: "comissões 90d", c: "#0f172a" },
            { l: "Antecipado", v: "R$ 1.2M", sub: "pago hoje", c: "#1c6dd0" },
            { l: "Cashback retorno", v: "R$ 18k", sub: "este mês", c: "#15803d" },
            { l: "Vendas 30d", v: "42 ops", sub: "+18% vs mês ant.", c: "#15803d" },
          ].map((k, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-lg p-2.5 bg-white"
            >
              <div className="text-[7px] uppercase tracking-wider text-slate-500 mb-0.5 font-mono">
                {k.l}
              </div>
              <div
                className="text-[14px] font-bold"
                style={{ color: k.c }}
              >
                {k.v}
              </div>
              <div className="text-[7px] text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="border border-slate-200 rounded-xl p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold text-slate-900">
              Próximos pagamentos · 30 dias
            </div>
            <div className="text-[8px] text-slate-500">
              <span className="text-[#15803d]">86% confirmado</span>
            </div>
          </div>
          {[
            { dia: "15/05", val: "R$ 24.500", corretor: "Carlos Silva · AQ-128", st: "ok" },
            { dia: "18/05", val: "R$ 18.200", corretor: "Ana Souza · AQ-127", st: "ok" },
            { dia: "22/05", val: "R$ 32.100", corretor: "Diego Lima · AQ-126", st: "ok" },
            { dia: "28/05", val: "R$ 14.800", corretor: "Bruna · AQ-125", st: "warn" },
          ].map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 border-t border-slate-100 first:border-t-0"
            >
              <div className="flex items-center gap-2">
                <div className="font-mono text-[9px] text-slate-500 w-10">
                  {p.dia}
                </div>
                <div className="text-[9px] text-slate-700">{p.corretor}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold text-slate-900">
                  {p.val}
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    p.st === "ok" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesktopConstrutoraBI() {
  return (
    <div className="w-full h-full bg-[#f8fafc] p-5 overflow-hidden">
      <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-1">
        b.i. · desempenho comercial
      </div>
      <div className="text-[15px] font-bold text-slate-900 mb-3">
        Empreendimentos · últimos 90 dias
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { l: "Total VGV", v: "R$ 48.2M", c: "#1c6dd0" },
          { l: "Comissões", v: "R$ 1.92M", c: "#1c6dd0" },
          { l: "Velocidade venda", v: "12 d/un", c: "#15803d" },
        ].map((k, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-lg p-2.5 bg-white"
          >
            <div className="text-[7px] uppercase tracking-wider text-slate-500 mb-0.5 font-mono">
              {k.l}
            </div>
            <div
              className="text-[16px] font-bold"
              style={{ color: k.c }}
            >
              {k.v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-slate-200 rounded-xl p-3 bg-white">
          <div className="text-[9px] font-bold text-slate-900 mb-2">
            Vendas por empreendimento
          </div>
          {[
            { nome: "Solar Park", v: "18 ops", w: "85%" },
            { nome: "Vista Mar", v: "13 ops", w: "62%" },
            { nome: "Residence", v: "9 ops", w: "44%" },
            { nome: "Jardins", v: "2 ops", w: "12%" },
          ].map((r) => (
            <div key={r.nome} className="mb-1.5">
              <div className="flex justify-between text-[8px] mb-0.5">
                <span className="text-slate-700">{r.nome}</span>
                <span className="text-slate-500 font-mono">{r.v}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1c6dd0]"
                  style={{ width: r.w }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-xl p-3 bg-white">
          <div className="text-[9px] font-bold text-slate-900 mb-2">
            Tempo médio · cadastro → venda
          </div>
          <div className="flex items-end gap-1 h-12 mb-2">
            {[20, 25, 18, 22, 15, 14, 12, 10, 11, 9, 8, 12].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-[#15803d] to-[#10b981] rounded-sm"
                style={{ height: `${(h / 25) * 100}%` }}
              />
            ))}
          </div>
          <div className="text-[10px] font-bold text-slate-900">
            12 dias <span className="text-[#15803d] text-[8px]">↓ -52% vs 12m</span>
          </div>
          <div className="text-[7px] text-slate-400 mt-0.5">
            esteira encurta com antecipação
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-3 bg-white col-span-2">
          <div className="text-[9px] font-bold text-slate-900 mb-2">
            Top corretores · giro de carteira
          </div>
          <div className="grid grid-cols-5 gap-2 text-[8px]">
            {[
              { n: "Carlos S.", v: "8 ops", r: "R$ 240k", t: "92" },
              { n: "Ana M.", v: "6 ops", r: "R$ 195k", t: "88" },
              { n: "Diego L.", v: "5 ops", r: "R$ 162k", t: "85" },
              { n: "Bruna C.", v: "4 ops", r: "R$ 138k", t: "78" },
              { n: "Felipe O.", v: "3 ops", r: "R$ 105k", t: "72" },
            ].map((c) => (
              <div
                key={c.n}
                className="rounded-lg bg-slate-50 p-2 text-center"
              >
                <div className="font-bold text-slate-900 text-[9px]">
                  {c.n}
                </div>
                <div className="text-slate-700 mt-0.5">{c.v}</div>
                <div className="text-[#1c6dd0] font-mono">{c.r}</div>
                <div className="mt-1 inline-block px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[7px] font-bold">
                  score {c.t}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesktopConstrutoraCobranca() {
  return (
    <div className="w-full h-full bg-[#f8fafc] p-5 overflow-hidden">
      <div className="text-[8px] uppercase tracking-wider font-mono text-slate-500 mb-1">
        cobrança · unificada
      </div>
      <div className="text-[15px] font-bold text-slate-900 mb-3">
        Duplicatas a pagar — 1 portal pra tudo
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { l: "A vencer 30d", v: "R$ 420k", t: "ok" },
          { l: "Já antecipadas", v: "32 ops", t: "info" },
          { l: "Vencidas", v: "0", t: "ok" },
        ].map((k, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-lg p-2.5 bg-white"
          >
            <div className="text-[7px] uppercase tracking-wider text-slate-500 mb-0.5 font-mono">
              {k.l}
            </div>
            <div
              className={`text-[16px] font-bold ${
                k.t === "ok"
                  ? "text-emerald-600"
                  : "text-[#1c6dd0]"
              }`}
            >
              {k.v}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-wider font-mono text-slate-500 font-bold">
          <div className="col-span-2">Venc.</div>
          <div className="col-span-3">Comprador</div>
          <div className="col-span-2">Corretor</div>
          <div className="col-span-2 text-right">Valor</div>
          <div className="col-span-1 text-right">Fundo</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        {[
          { d: "15/05", c: "João Silva", co: "Carlos S.", v: "R$ 24.5k", f: "C", st: "ok", stl: "✓ pago" },
          { d: "18/05", c: "Maria S.", co: "Ana M.", v: "R$ 18.2k", f: "C", st: "warn", stl: "vence em 3d" },
          { d: "22/05", c: "Pedro L.", co: "Diego L.", v: "R$ 32.1k", f: "X", st: "warn", stl: "vence em 7d" },
          { d: "28/05", c: "Lucia M.", co: "Bruna C.", v: "R$ 14.8k", f: "C", st: "info", stl: "boleto pronto" },
          { d: "02/06", c: "Carlos F.", co: "Felipe O.", v: "R$ 28.6k", f: "X", st: "info", stl: "boleto pronto" },
        ].map((r, i) => {
          const stColor =
            r.st === "ok"
              ? { bg: "#dcfce7", fg: "#15803d" }
              : r.st === "warn"
                ? { bg: "#fef3c7", fg: "#a16207" }
                : { bg: "#dbeafe", fg: "#1c6dd0" };
          return (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100 text-[9px] items-center first:border-t-0"
            >
              <div className="col-span-2 font-mono text-slate-700">{r.d}</div>
              <div className="col-span-3 text-slate-900 truncate">{r.c}</div>
              <div className="col-span-2 text-slate-600 truncate">{r.co}</div>
              <div className="col-span-2 text-right font-bold text-slate-900">
                {r.v}
              </div>
              <div className="col-span-1 text-right">
                <span className="inline-block w-4 h-4 rounded bg-[#1c6dd0] text-white text-[8px] font-bold leading-4">
                  {r.f}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span
                  className="px-2 py-0.5 rounded-full text-[8px] font-bold"
                  style={{ background: stColor.bg, color: stColor.fg }}
                >
                  {r.stl}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[8px] text-slate-500 text-center">
        💡 Boletos gerados automaticamente · baixa automática · multa/juros aplicados na régua
      </div>
    </div>
  );
}
