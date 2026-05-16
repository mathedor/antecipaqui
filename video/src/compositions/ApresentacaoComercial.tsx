import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SCENES, COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";
import { SceneProblema } from "../scenes/SceneProblema";
import { SceneSolucao } from "../scenes/SceneSolucao";
import { SceneMobile } from "../scenes/SceneMobile";
import { SceneCalculadora } from "../scenes/SceneCalculadora";
import { SceneDesktop } from "../scenes/SceneDesktop";
import { SceneRecursos } from "../scenes/SceneRecursos";
import { SceneBeneficios } from "../scenes/SceneBeneficios";

/* =========================================================================
   Apresentação para COMERCIAL Antecipaqui
   60s · 9 cenas · "Capture mais. Feche mais. Ganhe mais."
   Foco em: prospecção, pipeline, templates, comissão recorrente.
   ========================================================================= */

export function ApresentacaoComercial({
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

      <Sequence
        from={SCENES.hero.start}
        durationInFrames={SCENES.hero.duration}
      >
        <SceneComercialHero />
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
        <SceneMobile />
      </Sequence>
      <Sequence
        from={SCENES.calculadora.start}
        durationInFrames={SCENES.calculadora.duration}
      >
        <SceneCalculadora />
      </Sequence>
      <Sequence
        from={SCENES.desktop.start}
        durationInFrames={SCENES.desktop.duration}
      >
        <SceneDesktop />
      </Sequence>
      <Sequence
        from={SCENES.recursos.start}
        durationInFrames={SCENES.recursos.duration}
      >
        <SceneRecursos role="comercial" />
      </Sequence>
      <Sequence
        from={SCENES.beneficios.start}
        durationInFrames={SCENES.beneficios.duration}
      >
        <SceneBeneficios role="comercial" />
      </Sequence>
      <Sequence
        from={SCENES.cta.start}
        durationInFrames={SCENES.cta.duration}
      >
        <SceneComercialCTA />
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
function SceneComercialHero() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = popIn(frame, 0, fps, { damping: 14 });
  const word1Op = fadeIn(frame, 12, 18);
  const word1Y = slideY(frame, 12, 18, 40, 0);
  const word2Op = fadeIn(frame, 38, 18);
  const word2Y = slideY(frame, 38, 18, 40, 0);
  const word3Op = fadeIn(frame, 72, 18);
  const word3Scale = popIn(frame, 72, fps, { damping: 12, stiffness: 180 });

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={75} y={20} size={70} opacity={0.4} />
      <Blob color={COLORS.accentDark} x={15} y={85} size={50} opacity={0.5} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 80,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: COLORS.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: COLORS.accent,
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.white,
              letterSpacing: "-0.02em",
            }}
          >
            Antecipaqui · comercial
          </span>
        </div>

        {/* 3 frases sequenciais */}
        <div style={{ color: COLORS.white, width: "100%" }}>
          <div
            style={{
              opacity: word1Op,
              transform: `translateY(${word1Y}px)`,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: COLORS.fgMutedOnDark,
              marginBottom: 16,
            }}
          >
            Capture mais.
          </div>
          <div
            style={{
              opacity: word2Op,
              transform: `translateY(${word2Y}px)`,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: COLORS.fgMutedOnDark,
              marginBottom: 30,
            }}
          >
            Feche mais.
          </div>
          <div
            style={{
              opacity: word3Op,
              transform: `scale(${word3Scale})`,
              transformOrigin: "left center",
              fontSize: 140,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: COLORS.white,
            }}
          >
            Ganhe{" "}
            <span
              style={{
                color: COLORS.emerald,
                textShadow: `0 0 50px ${COLORS.emerald}`,
              }}
            >
              mais.
            </span>
          </div>
        </div>
      </AbsoluteFill>

      <Sticker
        text="o kit do captador"
        emoji="💼"
        appearAt={55}
        position="top-right"
        variant="yellow"
        size="md"
        inset={90}
      />
      <Sticker
        text="60s tour"
        appearAt={95}
        position="bottom-right"
        variant="white"
        size="sm"
        rotate={-5}
        inset={110}
      />
    </AbsoluteFill>
  );
}

/* ============ CTA ============ */
function SceneComercialCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = popIn(frame, 0, fps, { damping: 14 });
  const titleOp = fadeIn(frame, 12, 16);
  const titleY = slideY(frame, 12, 16, 40, 0);
  const subOp = fadeIn(frame, 38, 14);
  const ctaScale = popIn(frame, 55, fps, { damping: 12, stiffness: 200 });

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.emerald} x={50} y={50} size={90} opacity={0.4} />
      <Blob color={COLORS.accentDark} x={20} y={20} size={50} opacity={0.4} />
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
            opacity: titleOp,
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
          Vamos{" "}
          <span style={{ color: COLORS.emerald }}>juntos?</span>
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
          Comissão atrativa · ferramentas que economizam horas
          <br />
          Base de leads pré-qualificada.
        </div>

        <div
          style={{
            transform: `scale(${ctaScale})`,
            background: COLORS.white,
            color: COLORS.accent,
            padding: "32px 60px",
            borderRadius: 22,
            fontSize: 38,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            boxShadow: "0 40px 80px rgba(28,109,208,0.4)",
          }}
        >
          fale com nosso RH
        </div>
      </AbsoluteFill>

      <Sticker
        text="programa acelera"
        emoji="🚀"
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
