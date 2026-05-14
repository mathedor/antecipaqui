import { Composition } from "remotion";
import { ApresentacaoImobiliaria } from "./compositions/ApresentacaoImobiliaria";
import { FPS, DURATION_FRAMES, WIDTH, HEIGHT } from "./constants";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="apresentacao-imobiliaria"
        component={ApresentacaoImobiliaria}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ withAudio: false }}
      />
    </>
  );
}
