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
