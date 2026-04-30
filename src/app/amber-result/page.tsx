'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAmberCallback, cleanAmberUrl, clearPending } from '@/lib/amberIntent';
import { publishSignedEvent, loginWithAmberPubkey } from '@/lib/nostr';
import { useAuthStore } from '@/store/auth';

// Result key written to localStorage so the main tab (/) can show feedback.
export const AMBER_RESULT_KEY = 'amber_publish_result';

export default function AmberResult() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState('Procesando firma...');

  useEffect(() => {
    async function handle() {
      const cb = parseAmberCallback();
      cleanAmberUrl();

      if (!cb) {
        router.replace('/');
        return;
      }

      if (cb.action === 'login' && cb.pubkey) {
        try {
          const user = await loginWithAmberPubkey(cb.pubkey);
          if (user) {
            setUser(user, 'amber');
            localStorage.setItem(AMBER_RESULT_KEY, JSON.stringify({ type: 'login', ok: true, ts: Date.now() }));
          }
        } catch {
          localStorage.setItem(AMBER_RESULT_KEY, JSON.stringify({ type: 'login', ok: false, ts: Date.now() }));
        }
        clearPending();
        router.replace('/');
        return;
      }

      if (cb.action === 'sign' && cb.event) {
        clearPending();
        setStatus('Publicando en Nostr...');
        try {
          await publishSignedEvent(cb.event as Parameters<typeof publishSignedEvent>[0]);
          localStorage.setItem(AMBER_RESULT_KEY, JSON.stringify({ type: 'sign', ok: true, ts: Date.now() }));
          setStatus('¡Publicado!');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          localStorage.setItem(AMBER_RESULT_KEY, JSON.stringify({ type: 'sign', ok: false, err: msg, ts: Date.now() }));
          setStatus('Error: ' + msg);
        }
        // Short delay so user sees the status before redirect
        await new Promise(r => setTimeout(r, 800));
        router.replace('/');
      }
    }

    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-lc-black flex items-center justify-center">
      <div className="text-lc-green text-lg font-semibold animate-pulse">{status}</div>
    </div>
  );
}
