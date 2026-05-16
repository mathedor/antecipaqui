"use client";

import { useState, useEffect } from "react";
import { CorretorEquipeTour } from "@/components/onboarding/corretor-equipe-tour";

export function CorretorEquipeTourMount({
  autoOpen = false,
  imobNome,
}: {
  autoOpen?: boolean;
  imobNome: string;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-onboarding-tour:corretor-equipe", handler);
    return () =>
      window.removeEventListener(
        "open-onboarding-tour:corretor-equipe",
        handler,
      );
  }, []);

  return (
    <CorretorEquipeTour
      open={open}
      onClose={() => setOpen(false)}
      imobNome={imobNome}
    />
  );
}
