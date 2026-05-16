import { Composition } from "remotion";
import { ApresentacaoImobiliaria } from "./compositions/ApresentacaoImobiliaria";
import { ApresentacaoFundo } from "./compositions/ApresentacaoFundo";
import { ApresentacaoConstrutora } from "./compositions/ApresentacaoConstrutora";
import { ApresentacaoComercial } from "./compositions/ApresentacaoComercial";
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
        defaultProps={{ withMusic: false }}
      />
      <Composition
        id="apresentacao-fundo"
        component={ApresentacaoFundo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ withMusic: false }}
      />
      <Composition
        id="apresentacao-construtora"
        component={ApresentacaoConstrutora}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ withMusic: false }}
      />
      <Composition
        id="apresentacao-comercial"
        component={ApresentacaoComercial}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ withMusic: false }}
      />
    </>
  );
}
