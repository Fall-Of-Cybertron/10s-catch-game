import { useState, useEffect } from 'react';
import fpPromise from '@fingerprintjs/fingerprintjs';

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    // 1. Önce localStorage'ı kontrol et
    const storedFp = localStorage.getItem('game_fingerprint');
    if (storedFp) {
      setFingerprint(storedFp);
      return;
    }

    // 2. Yoksa yeni oluştur
    const loadFp = async () => {
      const fp = await fpPromise.load();
      const result = await fp.get();
      const visitorId = result.visitorId;
      localStorage.setItem('game_fingerprint', visitorId);
      setFingerprint(visitorId);
    };

    loadFp();
  }, []);

  return fingerprint;
}
