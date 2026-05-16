"use client";

import { useState, useEffect } from "react";
import { ConstrutoraTour } from "@/components/onboarding/construtora-tour";

export function ConstrutoraTourMount({
  autoOpen = false,
}: {
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-onboarding-tour:construtora", handler);
    return () =>
      window.removeEventListener(
        "open-onboarding-tour:construtora",
        handler,
      );
  }, []);

  return <ConstrutoraTour open={open} onClose={() => setOpen(false)} />;
}
