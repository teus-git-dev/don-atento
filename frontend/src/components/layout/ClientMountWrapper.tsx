'use client';
import { useEffect, useState } from 'react';

export default function ClientMountWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return <>{mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}</>;
}
