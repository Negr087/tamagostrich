'use client';

import { useEffect } from 'react';
import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { useAuthStore } from '@/store/auth';
import { getNDK, restoreNip46Session } from '@/lib/nostr';

export default function SessionRestorer() {
  const { isConnected, loginMethod, nip46Session } = useAuthStore();

  useEffect(() => {
    if (!isConnected) return;

    const ndk = getNDK();

    if (loginMethod === 'extension' && typeof window !== 'undefined' && window.nostr) {
      ndk.signer = new NDKNip07Signer(4000, ndk);
    } else if (loginMethod === 'bunker' && nip46Session) {
      restoreNip46Session(nip46Session);
    }
  }, []);

  return null;
}
