import React from "react";
import { useSystemSettings } from "@/app/providers/SettingsProvider";

interface BrandLogoProps {
  logoClassName?: string;
  textClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  logoClassName = "max-h-12 w-auto object-contain", 
  textClassName = "font-bold tracking-tight" 
}) => {
  const { appName, logoUrl, isLoading } = useSystemSettings();

  if (isLoading) {
    return <span className={`${textClassName} animate-pulse text-transparent bg-muted rounded`}>Loading...</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt={appName} 
          className={logoClassName}
        />
      )}
      <span className={textClassName}>
        {appName}
      </span>
    </div>
  );
};
