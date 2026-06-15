import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const NetworkDetector: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      // Sembunyikan pesan "Kembali Online" setelah 3 detik
      setTimeout(() => setShowBackOnline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showBackOnline) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[9999] flex justify-center transition-all duration-500 ease-in-out ${
        !isOnline ? 'translate-y-0' : (showBackOnline ? 'translate-y-0' : '-translate-y-full')
      }`}
    >
      <div 
        className={`px-4 py-2 rounded-b-xl shadow-lg flex items-center gap-2 text-xs font-bold text-white max-w-sm w-full mx-auto justify-center
          ${!isOnline ? 'bg-rose-500' : 'bg-emerald-500'}
        `}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse" />
            Anda sedang offline. Periksa koneksi internet Anda.
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            Koneksi internet kembali pulih!
          </>
        )}
      </div>
    </div>
  );
};
