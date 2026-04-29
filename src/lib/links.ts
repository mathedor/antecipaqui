// Para o MVP, uso uma página /entrar e /cadastre-se que depois conectam
// ao Clerk (sign-in / sign-up). Mantendo URLs limpas pra não trocar depois.
export const LINKS = {
  home: "/",
  comoFunciona: "/como-funciona",
  paraConstrutoras: "/para-construtoras",
  simulador: "/#simulador",
  perguntas: "/perguntas",
  entrar: "/entrar",
  cadastrar: "/cadastre-se",
};

export const WHATSAPP_NUMBER = "5547999999999"; // a confirmar com cliente
export const WHATSAPP_DISPLAY = "(47) 9 9999-9999";

const buildWhats = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const WHATSAPP_LINKS = {
  default: buildWhats("Olá! Vim pelo site do Antecipaqui e quero saber mais."),
  duvida: buildWhats("Olá! Tenho uma dúvida sobre antecipação de comissão."),
};
