import { getNDK, connectNDK, addUserRelays } from '@/lib/nostr';
import { useNoriStore, NoriAction } from '@/store/nori';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';

let subscription: NDKSubscription | null = null;
let decayInterval: ReturnType<typeof setInterval> | null = null;
let sessionId = 0; // increments on each start — async closures capture their own copy
let knownFollowers = new Set<string>(); // pubkeys que ya seguían al usuario antes de conectar
let listenerStartTime = 0; // unix timestamp (seconds) del momento en que arrancó el listener

export function startNoriListener(pubkey: string) {
  const store = useNoriStore.getState();
  if (store.isListening) return;

  store.setListening(true);
  const mySession = ++sessionId; // each invocation owns a unique id
  listenerStartTime = Math.floor(Date.now() / 1000);

  // Aplicar decay acumulado inmediatamente (cubre el tiempo que el browser estuvo cerrado)
  useNoriStore.getState().decayStats();

  // Seguir decayendo cada minuto mientras la página está abierta
  decayInterval = setInterval(() => {
    useNoriStore.getState().decayStats();

    // Animación de sueño si lleva 5+ minutos sin actividad
    const s = useNoriStore.getState();
    const idleMin = (Date.now() - s.lastEventTime) / 60000;
    if (idleMin >= 5) {
      s.triggerAction('no_activity', 'sin actividad reciente...');
    }
  }, 60000);

  // Add user's own relays first, then subscribe
  connectNDK().then(async (ndk) => {
    if (sessionId !== mySession) return; // a newer start() was already called

    try {
      await addUserRelays(pubkey);
    } catch {
      // non-fatal — continue with default relays
    }

    if (sessionId !== mySession) return;

    // Cargar seguidores actuales para no notificar falsamente los que ya seguían
    try {
      const existing = await Promise.race([
        ndk.fetchEvents({ kinds: [3], '#p': [pubkey] }),
        new Promise<Set<NDKEvent>>((resolve) => setTimeout(() => resolve(new Set()), 7000)),
      ]);
      existing.forEach(e => knownFollowers.add(e.pubkey));
    } catch {
      // no fatal — en el peor caso puede haber algún falso positivo al inicio
    }

    if (sessionId !== mySession) return;

    // Use `since` so relays only send events from this session onward.
    // Small 2-minute lookback covers the time spent connecting + fetching relays.
    const since = listenerStartTime - 120;

    subscription = ndk.subscribe(
      [
        // Zap receipts to user
        { kinds: [9735], '#p': [pubkey], since },
        // Reactions to user's notes
        { kinds: [7],    '#p': [pubkey], since },
        // Reposts of user's notes
        { kinds: [6],    '#p': [pubkey], since },
        // Contact lists that include user (new followers)
        { kinds: [3],    '#p': [pubkey], since },
        // Mentions in notes
        { kinds: [1],    '#p': [pubkey], since },
      ],
      { closeOnEose: false }
    );

    const seenEvents = new Set<string>();

    subscription.on('event', (event: NDKEvent) => {
      if (sessionId !== mySession) return;

      // Dedup
      if (seenEvents.has(event.id)) return;
      seenEvents.add(event.id);

      const trigger = useNoriStore.getState().triggerAction;

      switch (event.kind) {
        case 9735: {
          // Zap receipt — try to parse amount from the embedded zap request
          const senderPubkey = event.tags.find(t => t[0] === 'P')?.[1];
          let detail = '⚡ zapó';

          try {
            const desc = event.tags.find(t => t[0] === 'description')?.[1];
            if (desc) {
              const zapReq = JSON.parse(desc);
              const msats = zapReq.tags?.find((t: string[]) => t[0] === 'amount')?.[1];
              if (msats) {
                const sats = Math.round(Number(msats) / 1000);
                detail = `⚡ ${sats} sats`;
              }
            }
          } catch {
            // fallback — keep generic detail
          }

          trigger('zap_received', detail, senderPubkey);
          break;
        }

        case 7: {
          const content = event.content || '❤️';
          trigger('reaction_received', `reaccionó ${content}`, event.pubkey);
          break;
        }

        case 3: {
          // Ignorar eventos que existían antes de conectar (relays que replayan historia)
          if (event.created_at && event.created_at < listenerStartTime - 30) break;
          // Ignorar si ya era seguidor conocido
          if (knownFollowers.has(event.pubkey)) break;
          knownFollowers.add(event.pubkey);
          trigger('new_follower', 'te siguió', event.pubkey);
          break;
        }

        case 6: {
          trigger('reaction_received', 'reposteó tu nota', event.pubkey);
          break;
        }

        case 1: {
          if (event.pubkey === pubkey) {
            trigger('note_published', 'publicaste una nota nueva');
          } else {
            trigger('mention_received', 'te mencionó', event.pubkey);
          }
          break;
        }
      }
    });
  });
}

export function stopNoriListener() {
  sessionId++; // invalidate any pending async callbacks
  knownFollowers.clear();
  listenerStartTime = 0;

  if (subscription) {
    subscription.stop();
    subscription = null;
  }
  if (decayInterval) {
    clearInterval(decayInterval);
    decayInterval = null;
  }
  useNoriStore.getState().setListening(false);
}

// Simulate events for demo/testing
export function simulateNoriEvent(action: NoriAction) {
  const store = useNoriStore.getState();
  const messages: Record<NoriAction, string> = {
    zap_received:      '⚡ 21 sats',
    note_published:    'publicaste una nota nueva',
    reaction_received: 'reaccionó 🔥',
    repost_received:   'reposteó tu nota',
    no_activity:       'sin actividad reciente...',
    mention_received:  'te mencionó',
    new_follower:      'te siguió',
  };
  store.triggerAction(action, messages[action]);
}
