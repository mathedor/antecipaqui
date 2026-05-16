"use client";

import { useState, useEffect } from "react";
import { FundoTour } from "@/components/onboarding/fundo-tour";

export function FundoTourMount({
  autoOpen = false,
}: {
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-onboarding-tour:fundo", handler);
    return () =>
      window.removeEventListener("open-onboarding-tour:fundo", handler);
  }, []);

  return <FundoTour open={open} onClose={() => setOpen(false)} />;
}
