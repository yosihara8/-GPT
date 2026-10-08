"use client";

import { getProviders } from "next-auth/react";
import { useEffect, useState } from "react";

/** Google OAuth（GOOGLE_CLIENT_ID / SECRET）が設定されているときだけ true */
export function useGoogleSignInAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    getProviders()
      .then((p) => setAvailable(Boolean(p?.google)))
      .catch(() => setAvailable(false));
  }, []);
  return available;
}
