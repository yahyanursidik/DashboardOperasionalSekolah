import React from "react";
import { useStoredFileUrl } from "../../hooks/useStoredFileUrl";

interface StoredImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  source?: string | null;
  fallback?: React.ReactNode;
}

export const StoredImage: React.FC<StoredImageProps> = ({ source, fallback = null, alt = "", ...props }) => {
  const resolvedUrl = useStoredFileUrl(source);

  if (!resolvedUrl) return <>{fallback}</>;
  return <img src={resolvedUrl} alt={alt} {...props} />;
};
