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
import { SceneRecursos } from "../scenes/SceneRecursos";
import { SceneBeneficios } from "../scenes/SceneBeneficios";

/* =========================================================================
   Apresentação para FUNDOS DE INVESTIMENTO
   35s · 7 cenas · mesma estrutura da imobiliária mas mensagem voltada
   a originação, decisão segura e cobrança automatizada.
   ========================================================================= */

export function ApresentacaoFundo({
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
        <SceneFundoHero />
      </Sequence>
      <Sequence
        from={SCENES.problema.start}
        durationInFrames={SCENES.problema.duration}
      >
        <SceneFundoProblema />
      </Sequence>
      <Sequence
        from={SCENES.solucao.start}
        durationInFrames={SCENES.solucao.duration}
      >
        <SceneFundoSolucao />
      </Sequence>
      <Sequence
        from={SCENES.mobile.start}
        durationInFrames={SCENES.mobile.duration}
      >
        <SceneFundoMesa />
      </Sequence>
      <Sequence
        from={SCENES.calculadora.start}
        durationInFrames={SCENES.calculadora.duration}
      >
        <SceneFundoPainel />
      </Sequence>
      <Sequence
        from={SCENES.desktop.start}
        durationInFrames={SCENES.desktop.duration}
      >
        <SceneFundoSeguranca />
      </Sequence>
      <Sequence
        from={SCENES.recursos.start}
        durationInFrames={SCENES.recursos.duration}
      >
        <SceneRecursos role="fundo" />
      </Sequence>
      <Sequence
        from={SCENES.beneficios.start}
        durationInFrames={SCENES.beneficios.duration}
      >
        <SceneBeneficios role="fundo" />
      </Sequence>
      <Sequence
        from={SCENES.cta.start}
        durationInFrames={SCENES.cta.duration}
      >
        <SceneFundoCTA />
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
function SceneFundoHero() {
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
        {/* Badge */}
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
          PARA FUNDOS · INVESTIDORES
        </div>

        <div style={{ width: "100%" }}>
          <div
            style={{
              transform: `scale(${word1})`,
              fontSize: 120,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              marginBottom: 16,
              color: COLORS.fgMutedOnDark,
            }}
          >
            Originação
          </div>
          <div
            style={{
              transform: `scale(${word2})`,
              fontSize: 140,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              marginBottom: 30,
            }}
          >
            pronta.
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
            Yield consistente.
          </div>
        </div>
      </AbsoluteFill>

      <Sticker
        text="Capital trabalhando"
        emoji="📈"
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
function SceneFundoProblema() {
  const frame = useCurrentFrame();

  const ITENS = [
    { num: "💸", label: "Originação cara" },
    { num: "📋", label: "Análise pesada" },
    { num: "⚠️", label: "Risco difuso" },
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
            o que trava o fundo
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              maxWidth: 900,
            }}
          >
            Capital sobra.
            <br />
            <span style={{ color: COLORS.danger }}>
              Originar bem é o gargalo.
            </span>
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
        text="Time queima horas"
        emoji="⏱"
        appearAt={95}
        position="bottom-right"
        variant="dark"
        size="md"
        inset={100}
      />
    </AbsoluteFill>
  );
}

/* ============ SOLUÇÃO ============ */
function SceneFundoSolucao() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const PILARES = [
    { n: "01", title: "Pipeline cheio", desc: "pré-filtrado" },
    { n: "02", title: "Análise auto", desc: "IA + score" },
    { n: "03", title: "Decisão guiada", desc: "regras + mesa" },
    { n: "04", title: "Cobrança auto", desc: "CNAB + API" },
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
            a esteira pronta
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
            }}
          >
            Você só decide
            <br />e <span style={{ color: COLORS.emerald }}>investe</span>.
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
                    fontSize: 42,
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
                    fontSize: 22,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.75)",
                    marginTop: 4,
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
        text="Sem CRM próprio"
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

/* ============ MESA DE DECISÃO ============ */
function SceneFundoMesa() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 14);
  const cardScale = popIn(frame, 10, fps, { damping: 14 });

  const OPS = [
    { num: "AQ-128", const: "Solar", val: "R$ 80k", score: 92, tone: "good" },
    { num: "AQ-127", const: "MRV", val: "R$ 45k", score: 78, tone: "good" },
    { num: "AQ-126", const: "Direcional", val: "R$ 120k", score: 65, tone: "warn" },
    { num: "AQ-125", const: "Cyrela", val: "R$ 95k", score: 88, tone: "good" },
    { num: "AQ-124", const: "Even", val: "R$ 32k", score: 42, tone: "bad" },
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
            marginBottom: 40,
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
            mesa de decisão
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Score embutido,
            <br />
            <span style={{ color: COLORS.accent }}>1 clique decide.</span>
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
              marginBottom: 16,
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
              5 operações pendentes
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
              R$ 372k · spread 1.8%
            </div>
          </div>

          {OPS.map((op, i) => {
            const rowStart = 18 + i * 10;
            const rowOp = fadeIn(frame, rowStart, 10);
            const rowX = slideX(frame, rowStart, 12, -40, 0);
            const scoreColor =
              op.tone === "good"
                ? { bg: "#dcfce7", fg: "#15803d" }
                : op.tone === "warn"
                  ? { bg: "#fef3c7", fg: "#a16207" }
                  : { bg: "#fee2e2", fg: "#b91c1c" };
            return (
              <div
                key={op.num}
                style={{
                  opacity: rowOp,
                  transform: `translateX(${rowX}px)`,
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 140px 110px 90px",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 4px",
                  borderBottom:
                    i === OPS.length - 1
                      ? "none"
                      : `1px dashed ${COLORS.borderOnLight}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 18,
                    color: COLORS.fgDimOnLight,
                  }}
                >
                  {op.num}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: COLORS.fgOnLight,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {op.const}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.fgOnLight,
                    textAlign: "right",
                  }}
                >
                  {op.val}
                </div>
                <div
                  style={{
                    background: scoreColor.bg,
                    color: scoreColor.fg,
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 18,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  {op.score}
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: COLORS.emerald,
                      color: COLORS.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "#f1f5f9",
                      color: COLORS.fgMutedOnLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 900,
                    }}
                  >
                    ✕
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Sticker
        text="Auto-aprovação"
        emoji="⚙️"
        appearAt={120}
        position="bottom-left"
        variant="accent"
        size="sm"
        rotate={-4}
        inset={130}
      />
    </AbsoluteFill>
  );
}

/* ============ PAINEL DO FUNDO ============ */
function SceneFundoPainel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 14);
  const cardScale = popIn(frame, 10, fps, { damping: 14 });

  // Animação dos KPIs
  const capital = interpolate(frame, [15, 60], [0, 8.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });
  const yieldPct = interpolate(frame, [15, 60], [0, 1.9], {
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
            marginBottom: 40,
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
            sua carteira viva
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Em tempo
            <br />
            <span style={{ color: COLORS.accentLight }}>real.</span>
          </div>
        </div>

        <div
          style={{
            transform: `scale(${cardScale})`,
            background: COLORS.darkAlt,
            border: `1px solid ${COLORS.borderOnDark}`,
            borderRadius: 28,
            padding: 36,
            width: "100%",
            maxWidth: 850,
            boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                padding: 26,
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
                Capital exposto
              </div>
              <div
                style={{
                  fontSize: 68,
                  fontWeight: 900,
                  color: COLORS.white,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                }}
              >
                R$ {capital.toFixed(1)}M
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 10,
                }}
              >
                234 ops ativas
              </div>
            </div>

            <div
              style={{
                background: COLORS.emerald + "20",
                padding: 26,
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
                Yield projetado
              </div>
              <div
                style={{
                  fontSize: 68,
                  fontWeight: 900,
                  color: COLORS.emerald,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                }}
              >
                {yieldPct.toFixed(1)}%
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 10,
                }}
              >
                ao mês
              </div>
            </div>
          </div>

          {/* Mini chart de recebimentos */}
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
              Próximos 30 dias
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 60,
              }}
            >
              {[40, 65, 50, 80, 70, 90, 75, 88, 95, 82, 70, 60].map(
                (h, i) => {
                  const barIn = fadeIn(frame, 50 + i * 1.2, 12);
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h * barIn}%`,
                        borderRadius: 3,
                        background: `linear-gradient(180deg, ${COLORS.accentLight}, ${COLORS.accent})`,
                        opacity: barIn,
                      }}
                    />
                  );
                },
              )}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.white,
              }}
            >
              R$ 412.500{" "}
              <span style={{ color: COLORS.emerald, fontSize: 14 }}>
                86% confirmado
              </span>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <Sticker
        text="Forecast 30 dias"
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

/* ============ SEGURANÇA ============ */
function SceneFundoSeguranca() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 14);

  const PROTECOES = [
    { icon: "🪪", label: "KYC validado" },
    { icon: "📊", label: "Score evolutivo" },
    { icon: "📜", label: "Audit log imutável" },
    { icon: "🔒", label: "Webhook HMAC" },
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
            operação segura
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            4 camadas
            <br />
            <span style={{ color: COLORS.emerald }}>de proteção.</span>
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
          {PROTECOES.map((p, i) => {
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
                    fontSize: 32,
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
        text="LGPD + backup"
        emoji="🛡"
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
function SceneFundoCTA() {
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
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: COLORS.white,
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          Comissão imobiliária
          <br />
          <span style={{ color: COLORS.emerald }}>vira yield</span>.
        </div>

        <div
          style={{
            opacity: subOp,
            fontSize: 32,
            fontWeight: 500,
            color: COLORS.fgMutedOnDark,
            marginBottom: 50,
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          Pipeline pronto.
          <br />
          Decisão guiada. Cobrança automatizada.
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
        text="Convênio em 7 dias"
        emoji="🤝"
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
