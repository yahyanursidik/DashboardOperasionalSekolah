import React from "react";
import { Outlet } from "react-router-dom";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const AuthLayout: React.FC = () => {
  const { loginCoverUrl } = useSystemSettings();

  return (
    <div 
      className="flex min-h-screen items-center justify-center relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-100/60 to-emerald-200"
      style={loginCoverUrl ? {
        backgroundImage: `url(${loginCoverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {/* Dark overlay if using cover image to ensure form readability */}
      {loginCoverUrl && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>}

      {/* Decorative background blobs - only show if no cover */}
      {!loginCoverUrl && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </>
      )}
      
      <div className="w-full max-w-md p-6 sm:p-8 relative z-10">
        <Outlet />
      </div>
    </div>
  );
};
