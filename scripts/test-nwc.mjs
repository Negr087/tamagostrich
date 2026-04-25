/**
 * Run with: node scripts/test-nwc.mjs
 * Tests the NWC connection by sending a get_info request (no payment made).
 */
import { readFileSync } from 'fs';
import { WebSocket } from 'ws';
import { nip04, finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';

// Load .env.local
let nwcString;
try {
  const env = readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key?.trim() === 'NWC_CONNECTION_STRING') {
      nwcString = rest.join('=').trim().replace(/^"|"$/g, '');
    }
  }
} catch {
  nwcString = process.env.NWC_CONNECTION_STRING;
}

if (!nwcString) {
  console.error('❌ NWC_CONNECTION_STRING not found in .env.local');
  process.exit(1);
}

// Parse NWC string
const withoutScheme = nwcString.replace('nostr+walletconnect://', 'https://');
const url = new URL(withoutScheme);
const walletPubkey = url.hostname;
const relayUrl = url.searchParams.get('relay');
const secret = url.searchParams.get('secret');

const hexToBytes = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));

console.log('📋 NWC config:');
console.log('  Relay:', relayUrl);
console.log('  Wallet pubkey:', walletPubkey.slice(0, 16) + '...');
console.log('  Secret:', secret ? '✅ present (' + secret.length + ' chars)' : '❌ missing');
console.log('');

// Build get_info request
const secretBytes = hexToBytes(secret);
const encrypted = await nip04.encrypt(
  secret, walletPubkey,
  JSON.stringify({ method: 'get_info' }),
);
const reqEvent = finalizeEvent(
  { kind: 23194, created_at: Math.floor(Date.now() / 1000), tags: [['p', walletPubkey]], content: encrypted },
  secretBytes,
);

console.log('🔌 Connecting to relay...');

const ws = new WebSocket(relayUrl);
let done = false;

const timeout = setTimeout(() => {
  if (!done) {
    done = true;
    console.log('⏰ Timeout after 15s — wallet did not respond');
    console.log('');
    console.log('Possible causes:');
    console.log('  1. Primal wallet is not connected to the NWC relay');
    console.log('  2. The NWC connection string expired or was revoked');
    console.log('  3. Open the Primal app and check Settings → Wallet → NWC connections');
    ws.terminate();
    process.exit(1);
  }
}, 15000);

ws.on('open', () => {
  console.log('✅ Connected to relay');
  // Subscribe for response
  ws.send(JSON.stringify([
    'REQ', 'test',
    { kinds: [23195], '#e': [reqEvent.id], authors: [walletPubkey], limit: 1 },
  ]));
  ws.send(JSON.stringify([
    'REQ', 'test2',
    { kinds: [23195], authors: [walletPubkey], since: reqEvent.created_at - 1, limit: 5 },
  ]));
  // Send get_info
  ws.send(JSON.stringify(['EVENT', reqEvent]));
  console.log('📤 Sent get_info request, waiting for wallet response...');
});

ws.on('message', async (data) => {
  const msg = JSON.parse(data.toString());
  if (msg[0] === 'OK' && msg[1] === reqEvent.id) {
    if (!msg[2]) {
      console.log('❌ Relay rejected event:', msg[3]);
      clearTimeout(timeout); done = true; ws.terminate(); process.exit(1);
    } else {
      console.log('✅ Relay accepted event');
    }
  }
  if (msg[0] === 'AUTH') {
    console.log('❌ Relay requires NIP-42 authentication — incompatible with this setup');
    clearTimeout(timeout); done = true; ws.terminate(); process.exit(1);
  }
  if (msg[0] === 'EVENT' && msg[2]?.kind === 23195) {
    try {
      const decrypted = await nip04.decrypt(secret, walletPubkey, msg[2].content);
      const response = JSON.parse(decrypted);
      console.log('');
      console.log('✅ Wallet responded!');
      console.log('   Response:', JSON.stringify(response, null, 2));
      clearTimeout(timeout); done = true; ws.terminate();
      process.exit(0);
    } catch (e) {
      console.log('❌ Could not decrypt response:', e.message);
    }
  }
});

ws.on('error', (err) => {
  console.log('❌ WebSocket error:', err.message);
  clearTimeout(timeout); done = true; process.exit(1);
});
