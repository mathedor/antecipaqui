import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Regras estritas do React 19 que pegam patterns funcionais existentes
    // no app. Reabilitar pontualmente quando refatorar:
    //   set-state-in-effect — useEffect+setState pra sincronizar state derivada
    //   static-components   — componentes auxiliares definidos dentro do parent
    //   refs                — acesso a refs durante render (componentes anim/UI)
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
    },
  },
]);

export default eslintConfig;
