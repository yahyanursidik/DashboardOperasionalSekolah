import React from "react";
import { getDocumentSignedUrl } from "../lib/supabase/storage";

export function useStoredFileUrl(source?: string | null, expiresIn = 3600) {
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!source) {
      queueMicrotask(() => { if (active) setResolvedUrl(null); });
    } else {
      void getDocumentSignedUrl(source, expiresIn)
        .then((url) => { if (active) setResolvedUrl(url); })
        .catch(() => { if (active) setResolvedUrl(null); });
    }
    return () => { active = false; };
  }, [expiresIn, source]);

  return resolvedUrl;
}
