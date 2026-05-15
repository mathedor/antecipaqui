import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { SCENES, COLORS } from "../constants";
import { fadeIn, slideX, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";

/* =========================================================================
   Apresentação para CONSTRUTORAS
   35s · 7 cenas · "Você paga parcelado. Corretor recebe à vista."
   Foco em: fluxo de caixa intacto, cobrança unificada, B.I., 100% digital.
   ========================================================================= */

export function ApresentacaoConstrutora({
  withMusic = false,
}: {
  withMusic?: boolean;
}) {
  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {withMusic && (
        <Audio src={staticFile("music.mp3")} volume={0.35} loop />
      )}

      <Sequence from={SCENES.hero.start} durationInFrames={SCENES.hero.duration}>
        <SceneHero />
      </Sequence>
      <Sequence
        from={SCENES.problema.start}
        durationInFrames={SCENES.problema.duration}
      >
        <SceneProblema />
      </Sequence>
      <Sequence
        from={SCENES.solucao.start}
        durationInFrames={SCENES.solucao.duration}
      >
        <SceneSolucao />
      </Sequence>
      <Sequence
        from={SCENES.mobile.start}
        durationInFrames={SCENES.mobile.duration}
      >
        <SceneCobranca />
      </Sequence>
      <Sequence
        from={SCENES.calculadora.start}
        durationInFrames={SCENES.calculadora.duration}
      >
        <SceneBI />
      </Sequence>
      <Sequence
        from={SCENES.desktop.start}
        durationInFrames={SCENES.desktop.duration}
      >
        <SceneDigital />
      </Sequence>
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <SceneCTA />
      </Sequence>

      <ProgressBar />
    </AbsoluteFill>
  );
}

function ProgressBar() {
  const frame = useCurrentFrame();
  const total = Object.values(SCENES).reduce((s, c) => s + c.duration, 0);
  const pct = (frame / total) * 100;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${COLORS.accentLight}, ${COLORS.accent})`,
        }}
      />
    </div>
  );
}

/* ============ HERO ============ */
function SceneHero() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeOp = fadeIn(frame, 0, 10);
  const word1 = popIn(frame, 10, fps, { damping: 14, stiffness: 200 });
  const word2 = popIn(frame, 32, fps, { damping: 14, stiffness: 200 });
  const word3Op = fadeIn(frame, 60, 18);
  const word3Y = slideY(frame, 60, 18, 60, 0);

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={75} y={20} size={70} opacity={0.4} />
      <Blob color={COLORS.accentDark} x={20} y={85} size={50} opacity={0.5} />
      <Blob color={COLORS.emerald} x={85} y={75} size={35} opacity={0.2} />
      <Noise opacity={0.05} />

      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "flex-start",
          color: COLORS.fgOnDark,
        }}
      >
        <div
          style={{
            opacity: badgeOp,
            background: "rgba(28,109,208,0.18)",
            color: COLORS.accentLight,
            padding: "10px 22px",
            borderRadius: 999,
            fontFamily: "ui-monospace, monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            border: `2px solid ${COLORS.accent}55`,
            marginBottom: 50,
          }}
        >
          PARA CONSTRUTORAS
        </div>

        <div style={{ width: "100%" }}>
          <div
            style={{
              transform: `scale(${word1})`,
              fontSize: 110,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: COLORS.fgMutedOnDark,
              marginBottom: 16,
            }}
          >
            Você paga
          </div>
          <div
            style={{
              transform: `scale(${word2})`,
              fontSize: 130,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              marginBottom: 30,
            }}
          >
            parcelado.
          </div>

          <div
            style={{
              opacity: word3Op,
              transform: `translateY(${word3Y}px)`,
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: COLORS.emerald,
            }}
          >
            Corretor recebe hoje.
          </div>
        </div>
      </AbsoluteFill>

      <Sticker
        text="Caixa intacto"
        emoji="💼"
        appearAt={75}
        position="bottom-right"
        variant="yellow"
        size="sm"
        rotate={-5}
        inset={110}
      />
    </AbsoluteFill>
  );
}

/* ============ PROBLEMA ============ */
function SceneProblema() {
  const frame = useCurrentFrame();

  const ITENS = [
    { num: "💸", label: "Descasa o caixa" },
    { num: "🏃", label: "Corretor desengaja" },
    { num: "📂", label: "Cobrança no Excel" },
  ];

  const headerOp = fadeIn(frame, 0, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.whiteBg, overflow: "hidden" }}>
      <Noise opacity={0.03} />

      <AbsoluteFill
        style={{
          padding: "100px 60px",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            opacity: headerOp,
            color: COLORS.fgOnLight,
            marginBottom: 70,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.danger,
              fontWeight: 700,
              marginBottom: 20,
              textTransform: "uppercase",
            }}
          >
            o impasse
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              maxWidth: 900,
            }}
          >
            Pagar à vista{" "}
            <span style={{ color: COLORS.danger }}>quebra seu caixa</span>.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {ITENS.map((it, i) => {
            const start = 22 + i * 22;
            const fromLeft = i % 2 === 0;
            const x = slideX(frame, start, 18, fromLeft ? -120 : 120, 0);
            const op = fadeIn(frame, start, 14);

            return (
              <div
                key={it.label}
                style={{
                  opacity: op,
                  transform: `translateX(${x}px)`,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.borderOnLight}`,
                  borderLeft: `6px solid ${COLORS.danger}`,
                  borderRadius: 18,
                  padding: "30px 36px",
                  display: "flex",
                  alignItems: "center",
                  gap: 32,
                  boxShadow: "0 12px 40px rgba(10,14,26,0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: 80,
                    lineHeight: 1,
                    minWidth: 100,
                    textAlign: "center",
                  }}
                >
                  {it.num}
                </div>
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: 700,
                    color: COLORS.fgOnLight,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {it.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Sticker
        text="Sua equipe sangra"
        emoji="🩸"
        appearAt={95}
        position="bottom-right"
        variant="dark"
        size="sm"
        inset={100}
      />
    </AbsoluteFill>
  );
}

/* ============ SOLUÇÃO ============ */
function SceneSolucao() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const PILARES = [
    { n: "01", title: "Fluxo intacto", desc: "paga em parcelas" },
    { n: "02", title: "Corretor à vista", desc: "no mesmo dia" },
    { n: "03", title: "Cobrança 1 portal", desc: "boleto + baixa auto" },
    { n: "04", title: "B.I. comercial", desc: "do empreendimento" },
  ];

  const headerOp = fadeIn(frame, 0, 14);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.accentDark} 0%, ${COLORS.accent} 100%)`,
        overflow: "hidden",
      }}
    >
      <Blob color={COLORS.white} x={80} y={20} size={45} opacity={0.15} />
      <Blob color={COLORS.white} x={15} y={85} size={40} opacity={0.1} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            opacity: headerOp,
            marginBottom: 60,
            color: COLORS.white,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              fontWeight: 700,
              marginBottom: 20,
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            o melhor dos dois mundos
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
            }}
          >
            Antecipaqui paga
            <br />
            <span style={{ color: COLORS.emerald }}>no seu lugar</span>.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            width: "100%",
          }}
        >
          {PILARES.map((p, i) => {
            const start = 30 + i * 12;
            const scale = popIn(frame, start, fps, { damping: 12 });
            const op = fadeIn(frame, start, 14);
            return (
              <div
                key={p.n}
                style={{
                  opacity: op,
                  transform: `scale(${scale})`,
                  background: "rgba(255,255,255,0.10)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  borderRadius: 24,
                  padding: "24px 28px",
                }}
              >
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginBottom: 10,
                  }}
                >
                  {p.n}
                </div>
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 800,
                    color: COLORS.white,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.75)",
                    marginTop: 6,
                  }}
                >
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Sticker
        text="Sem custo extra"
        emoji="✓"
        appearAt={40}
        position="top-right"
        variant="yellow"
        size="sm"
        rotate={6}
        inset={100}
      />
    </AbsoluteFill>
  );
}

/* ============ COBRANÇA UNIFICADA ============ */
function SceneCobranca() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 14);
  const cardScale = popIn(frame, 10, fps, { damping: 14 });

  const PARCELAS = [
    { d: "15/05", c: "João Silva", v: "R$ 24.5k", st: "ok" },
    { d: "18/05", c: "Maria S.", v: "R$ 18.2k", st: "warn" },
    { d: "22/05", c: "Pedro L.", v: "R$ 32.1k", st: "info" },
    { d: "28/05", c: "Lucia M.", v: "R$ 14.8k", st: "ok" },
  ] as const;

  return (
    <AbsoluteFill style={{ background: COLORS.whiteBg, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={70} opacity={0.10} />
      <Noise opacity={0.03} />

      <AbsoluteFill
        style={{
          padding: 60,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: titleOp,
            color: COLORS.fgOnLight,
            textAlign: "center",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.accent,
              fontWeight: 700,
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            cobrança unificada
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            1 portal,
            <br />
            <span style={{ color: COLORS.accent }}>1 conciliação.</span>
          </div>
        </div>

        <div
          style={{
            transform: `scale(${cardScale})`,
            background: COLORS.white,
            borderRadius: 28,
            padding: 30,
            width: "100%",
            maxWidth: 880,
            border: `1px solid ${COLORS.borderOnLight}`,
            boxShadow: "0 40px 100px rgba(28,109,208,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 20,
              paddingBottom: 14,
              borderBottom: `1px solid ${COLORS.borderOnLight}`,
            }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 16,
                letterSpacing: "0.2em",
                color: COLORS.fgDimOnLight,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              próximas duplicatas
            </div>
            <div
              style={{
                background: COLORS.emerald + "20",
                color: COLORS.emerald,
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              R$ 89.6k · 30 dias
            </div>
          </div>

          {PARCELAS.map((r, i) => {
            const rowStart = 18 + i * 12;
            const rowOp = fadeIn(frame, rowStart, 10);
            const rowX = slideX(frame, rowStart, 14, -40, 0);
            const stColor =
              r.st === "ok"
                ? { bg: "#dcfce7", fg: "#15803d", label: "✓ pago" }
                : r.st === "warn"
                  ? { bg: "#fef3c7", fg: "#a16207", label: "vence em 3d" }
                  : { bg: "#dbeafe", fg: "#1c6dd0", label: "boleto pronto" };
            return (
              <div
                key={r.d}
                style={{
                  opacity: rowOp,
                  transform: `translateX(${rowX}px)`,
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 160px 200px",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 4px",
                  borderBottom:
                    i === PARCELAS.length - 1
                      ? "none"
                      : `1px dashed ${COLORS.borderOnLight}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 22,
                    color: COLORS.fgDimOnLight,
                    fontWeight: 700,
                  }}
                >
                  {r.d}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: COLORS.fgOnLight,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {r.c}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.fgOnLight,
                    textAlign: "right",
                  }}
                >
                  {r.v}
                </div>
                <div
                  style={{
                    background: stColor.bg,
                    color: stColor.fg,
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 18,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  {stColor.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Sticker
        text="Boleto auto · baixa auto"
        emoji="🤖"
        appearAt={130}
        position="bottom-right"
        variant="accent"
        size="sm"
        rotate={-3}
        inset={100}
      />
    </AbsoluteFill>
  );
}

/* ============ B.I. ============ */
function SceneBI() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 14);
  const cardScale = popIn(frame, 10, fps, { damping: 14 });

  // Anim KPIs
  const vgv = interpolate(frame, [15, 60], [0, 48.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });
  const vendas = interpolate(frame, [15, 60], [0, 42], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={70} y={70} size={55} opacity={0.35} />
      <Blob color={COLORS.emerald} x={25} y={25} size={45} opacity={0.20} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 60,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: titleOp,
            color: COLORS.white,
            textAlign: "center",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.accentLight,
              fontWeight: 700,
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            b.i. comercial
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Quem vendeu,
            <br />
            <span style={{ color: COLORS.accentLight }}>quanto, onde.</span>
          </div>
        </div>

        <div
          style={{
            transform: `scale(${cardScale})`,
            background: COLORS.darkAlt,
            border: `1px solid ${COLORS.borderOnDark}`,
            borderRadius: 28,
            padding: 32,
            width: "100%",
            maxWidth: 850,
            boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                padding: 24,
                borderRadius: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.85)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                VGV · 90 dias
              </div>
              <div
                style={{
                  fontSize: 62,
                  fontWeight: 900,
                  color: COLORS.white,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                }}
              >
                R$ {vgv.toFixed(1)}M
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 10,
                }}
              >
                4 empreendimentos ativos
              </div>
            </div>

            <div
              style={{
                background: COLORS.emerald + "20",
                padding: 24,
                borderRadius: 18,
                border: `1px solid ${COLORS.emerald}55`,
              }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  color: COLORS.emerald,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Velocidade
              </div>
              <div
                style={{
                  fontSize: 62,
                  fontWeight: 900,
                  color: COLORS.emerald,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                }}
              >
                {Math.round(vendas)} ops
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 10,
                }}
              >
                ↑ +18% vs mês ant.
              </div>
            </div>
          </div>

          {/* Ranking empreendimentos */}
          <div
            style={{
              background: COLORS.dark,
              padding: 22,
              borderRadius: 18,
              border: `1px solid ${COLORS.borderOnDark}`,
            }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 14,
                letterSpacing: "0.18em",
                color: COLORS.fgDimOnDark,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              top empreendimentos
            </div>
            {[
              { n: "Solar Park", v: "18 ops", w: "85%" },
              { n: "Vista Mar", v: "13 ops", w: "62%" },
              { n: "Residence", v: "9 ops", w: "44%" },
            ].map((r, i) => {
              const barIn = fadeIn(frame, 55 + i * 8, 14);
              return (
                <div key={r.n} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: COLORS.white,
                      }}
                    >
                      {r.n}
                    </span>
                    <span
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 16,
                        color: COLORS.fgMutedOnDark,
                      }}
                    >
                      {r.v}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 6,
                      background: COLORS.borderOnDark,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `calc(${r.w} * ${barIn})`,
                        background: `linear-gradient(90deg, ${COLORS.accentLight}, ${COLORS.accent})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>

      <Sticker
        text="Pronto pra diretoria"
        emoji="📊"
        appearAt={40}
        position="top-right"
        variant="white"
        size="sm"
        rotate={4}
        inset={100}
      />
    </AbsoluteFill>
  );
}

/* ============ 100% DIGITAL ============ */
function SceneDigital() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 14);

  const FEATURES = [
    { icon: "📲", label: "Confirmação 1 clique" },
    { icon: "📨", label: "Recap diário no email" },
    { icon: "💬", label: "Chat por operação" },
    { icon: "🎁", label: "Cashback fidelidade" },
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.whiteBg, overflow: "hidden" }}>
      <Blob color={COLORS.emerald} x={80} y={80} size={50} opacity={0.15} />
      <Blob color={COLORS.accent} x={20} y={20} size={50} opacity={0.10} />
      <Noise opacity={0.03} />

      <AbsoluteFill
        style={{
          padding: 60,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: titleOp,
            color: COLORS.fgOnLight,
            textAlign: "center",
            marginBottom: 50,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.emerald,
              fontWeight: 700,
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            100% digital
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Sem papel.
            <br />
            <span style={{ color: COLORS.emerald }}>Sem reunião.</span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            width: "100%",
            maxWidth: 850,
          }}
        >
          {FEATURES.map((p, i) => {
            const start = 25 + i * 14;
            const scale = popIn(frame, start, fps, { damping: 14 });
            const op = fadeIn(frame, start, 12);
            return (
              <div
                key={p.label}
                style={{
                  opacity: op,
                  transform: `scale(${scale})`,
                  background: COLORS.white,
                  border: `2px solid ${COLORS.emerald}33`,
                  borderRadius: 22,
                  padding: 32,
                  textAlign: "center",
                  boxShadow: "0 20px 50px rgba(16,185,129,0.10)",
                }}
              >
                <div style={{ fontSize: 72, marginBottom: 12 }}>{p.icon}</div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    color: COLORS.fgOnLight,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {p.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Sticker
        text="Sem fidelidade"
        emoji="🆓"
        appearAt={120}
        position="bottom-right"
        variant="white"
        size="sm"
        rotate={-3}
        inset={100}
      />
    </AbsoluteFill>
  );
}

/* ============ CTA ============ */
function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = popIn(frame, 0, fps, { damping: 14 });
  const titleOpacity = fadeIn(frame, 12, 16);
  const titleY = slideY(frame, 12, 16, 40, 0);
  const subOp = fadeIn(frame, 38, 14);
  const ctaScale = popIn(frame, 55, fps, { damping: 12, stiffness: 200 });

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={90} opacity={0.5} />
      <Blob color={COLORS.emerald} x={80} y={20} size={40} opacity={0.3} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${logoScale})`,
            marginBottom: 50,
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              background: COLORS.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 50,
              fontWeight: 900,
              color: COLORS.accent,
              boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
            }}
          >
            A
          </div>
        </div>

        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: COLORS.white,
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          Seu caixa intacto.
          <br />
          <span style={{ color: COLORS.emerald }}>Seu corretor feliz</span>.
        </div>

        <div
          style={{
            opacity: subOp,
            fontSize: 30,
            fontWeight: 500,
            color: COLORS.fgMutedOnDark,
            marginBottom: 50,
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          Cadastro em 15 minutos.
          <br />
          Sem fidelidade. Sem custo. Cashback incluído.
        </div>

        <div
          style={{
            transform: `scale(${ctaScale})`,
            background: COLORS.white,
            color: COLORS.accent,
            padding: "32px 60px",
            borderRadius: 22,
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            boxShadow: "0 40px 80px rgba(28,109,208,0.4)",
          }}
        >
          antecipaqui.digital
        </div>
      </AbsoluteFill>

      <Sticker
        text="Cadastro 15 min"
        emoji="⚡"
        appearAt={75}
        position="top-right"
        variant="yellow"
        size="md"
        rotate={6}
        inset={90}
      />
    </AbsoluteFill>
  );
}
