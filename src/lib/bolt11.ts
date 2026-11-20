// Decode the amount from a bolt11 invoice's human-readable prefix.
// Format: ln<network><amount><multiplier>1<data>. Multipliers are relative to 1 BTC.
// Returns millisatoshis, or null when the invoice has no amount / can't be parsed.
export function bolt11ToMsats(bolt11: string): number | null {
  const m = bolt11.toLowerCase().match(/^ln(?:bc|tb|bcrt|tbs|sb)(\d+)([munp])?1[02-9ac-hj-np-z]+$/);
  if (!m) return null;
  const v = BigInt(m[1]);
  const MSAT_PER_BTC = BigInt(100_000_000_000);
  let msats: bigint;
  switch (m[2]) {
    case 'm': msats = (v * MSAT_PER_BTC) / BigInt(1_000); break;
    case 'u': msats = (v * MSAT_PER_BTC) / BigInt(1_000_000); break;
    case 'n': msats = (v * MSAT_PER_BTC) / BigInt(1_000_000_000); break;
    case 'p': msats = (v * MSAT_PER_BTC) / BigInt(1_000_000_000_000); break;
    default:  msats = v * MSAT_PER_BTC;
  }
  return Number(msats);
}

export function bolt11ToSats(bolt11: string): number {
  const msats = bolt11ToMsats(bolt11);
  return msats === null ? 0 : Math.round(msats / 1000);
}
