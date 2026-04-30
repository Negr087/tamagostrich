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
        // Always restore module-level session as fallback for publishPetState
        restoreNip46Session(nip46Session);

        // Also reconstruct the NDKNip46Signer so ndk.signer is properly set.
        // This allows NDK's native signing path (with better reconnection handling) instead of
        // our manual signEventViaNip46 fallback.
        import('@nostr-dev-kit/ndk').then(({ NDKNip46Signer, NDKPrivateKeySigner, NDKUser }) => {
          try {
            if (nip46Session.signerPayload) {
              // bunker:// URL login: restore from full serialized payload
              NDKNip46Signer.fromPayload(nip46Session.signerPayload, ndk).then(signer => {
                ndk.signer = signer;
              }).catch(e => console.warn('[nip46] fromPayload failed:', e));
            } else if (nip46Session.clientSecretHex && nip46Session.signerPubkey && profile.pubkey) {
              // QR login: reconstruct from stored session data
              const localSigner = new NDKPrivateKeySigner(nip46Session.clientSecretHex);
              const signer = new NDKNip46Signer(ndk, false, localSigner, nip46Session.relays);
              signer.userPubkey = profile.pubkey;
              signer.bunkerPubkey = nip46Session.signerPubkey;
              signer.relayUrls = nip46Session.relays;
              const user = new NDKUser({ pubkey: profile.pubkey });
              user.ndk = ndk;
              (signer as any)._user = user;
              ndk.signer = signer;
            }
          } catch (e) {
            console.warn('[nip46] signer restore failed:', e);
          }
        });
      }
    }
  }, []);

  return null;
}
