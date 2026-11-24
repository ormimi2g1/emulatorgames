import { useEffect, useState } from 'react';

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <span role="status" className="rounded-full bg-sun px-3 py-1 text-sm font-bold text-navy">
      ✈️ Offline
    </span>
  );
}
