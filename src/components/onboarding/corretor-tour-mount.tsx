"use client";

import { useState, useEffect } from "react";
import { CorretorTour } from "@/components/onboarding/corretor-tour";

export function CorretorTourMount({
  autoOpen = false,
  isImobOwner,
}: {
  autoOpen?: boolean;
  isImobOwner: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-onboarding-tour:corretor", handler);
    return () =>
      window.removeEventListener("open-onboarding-tour:corretor", handler);
  }, []);

  return (
    <CorretorTour
      open={open}
      onClose={() => setOpen(false)}
      isImobOwner={isImobOwner}
    />
  );
}
