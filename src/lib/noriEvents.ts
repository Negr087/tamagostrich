import { getNDK, connectNDK, addUserRelays, parseZapReceipt } from '@/lib/nostr';
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
      s.triggerAction('no_activity', undefined);
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
    // 10-minute lookback covers connection time + any events that arrived just before the app opened.
    const since = listenerStartTime - 600;

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
          const { senderPubkey, amountSats } = parseZapReceipt(event);
          const detail = amountSats > 0 ? `${amountSats} sats` : undefined;
          trigger('zap_received', detail, senderPubkey);
          break;
        }

        case 7: {
          const content = event.content || '❤️';
          trigger('reaction_received', content, event.pubkey);
          break;
        }

        case 3: {
          // Ignorar eventos que existían antes de conectar (relays que replayan historia)
          if (event.created_at && event.created_at < listenerStartTime - 30) break;
          // Ignorar si ya era seguidor conocido
          if (knownFollowers.has(event.pubkey)) break;
          knownFollowers.add(event.pubkey);
          trigger('new_follower', undefined, event.pubkey);
          break;
        }

        case 6: {
          trigger('repost_received', undefined, event.pubkey);
          break;
        }

        case 1: {
          if (event.pubkey === pubkey) {
            trigger('note_published', undefined);
          } else {
            trigger('mention_received', undefined, event.pubkey);
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
  const details: Partial<Record<NoriAction, string>> = {
    zap_received:      '21 sats',
    reaction_received: '🔥',
  };
  store.triggerAction(action, details[action]);
}
