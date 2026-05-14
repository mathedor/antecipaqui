import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SCENES, COLORS } from "../constants";
import { SceneHero } from "../scenes/SceneHero";
import { SceneProblema } from "../scenes/SceneProblema";
import { SceneSolucao } from "../scenes/SceneSolucao";
import { SceneMobile } from "../scenes/SceneMobile";
import { SceneCalculadora } from "../scenes/SceneCalculadora";
import { SceneDesktop } from "../scenes/SceneDesktop";
import { SceneCTA } from "../scenes/SceneCTA";

export function ApresentacaoImobiliaria({
  withAudio = false,
}: {
  withAudio?: boolean;
}) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      {withAudio && <Audio src={staticFile("narration.mp3")} />}

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

      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <SceneCTA />
      </Sequence>

      {/* Progress bar inferior — sempre visível, sutilmente avança */}
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
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.emerald})`,
          transition: "none",
        }}
      />
    </div>
  );
}
