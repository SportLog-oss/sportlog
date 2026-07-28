"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ForceRefreshOnLoad() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/refresh", { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {
        // best-effort — page just shows whatever is already cached
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
