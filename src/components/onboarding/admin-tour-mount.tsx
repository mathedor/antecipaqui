"use client";

import { useState, useEffect } from "react";
import { AdminTour } from "@/components/onboarding/admin-tour";

export function AdminTourMount({
  autoOpen = false,
}: {
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-onboarding-tour:admin", handler);
    return () =>
      window.removeEventListener("open-onboarding-tour:admin", handler);
  }, []);

  return <AdminTour open={open} onClose={() => setOpen(false)} />;
}
