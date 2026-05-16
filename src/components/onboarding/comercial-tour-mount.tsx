"use client";

import { useState, useEffect } from "react";
import { ComercialTour } from "@/components/onboarding/comercial-tour";

/** Monta o tour do comercial. Auto-abre se ainda não foi completado.
 *  Listener pra evento global 'open-onboarding-tour:comercial' permite
 *  reabrir via botão no dropdown. */
export function ComercialTourMount({
  autoOpen = false,
}: {
  /** True se user nunca completou o tour (dashboard server passa essa info). */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-onboarding-tour:comercial", handler);
    return () =>
      window.removeEventListener("open-onboarding-tour:comercial", handler);
  }, []);

  return <ComercialTour open={open} onClose={() => setOpen(false)} />;
}
