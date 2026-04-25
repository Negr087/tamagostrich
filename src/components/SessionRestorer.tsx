'use client';

import { useEffect } from 'react';
import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { useAuthStore } from '@/store/auth';
import { getNDK, restoreNip46Session, restoreNsecSigner } from '@/lib/nostr';

export default function SessionRestorer() {
  useEffect(() => {
    // Register service worker for PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    const { profile, loginMethod, nip46Session, isConnected, restoreSession } = useAuthStore.getState();

    // If profile is persisted but isConnected is false (page load / back navigation)
    if (profile && !isConnected) {
      restoreSession();
    }

    // Restore NDK signer so event signing keeps working after page reload
    if (profile) {
      const ndk = getNDK();
      if (loginMethod === 'extension' && typeof window !== 'undefined' && window.nostr) {
        ndk.signer = new NDKNip07Signer(4000, ndk);
      } else if (loginMethod === 'nsec') {
        restoreNsecSigner(); // restores from sessionStorage (survives reload, cleared on tab close)
      } else if (loginMethod === 'bunker' && nip46Session) {
        restoreNip46Session(nip46Session);
      }
    }
  }, []);

  return null;
}
