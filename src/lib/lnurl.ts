export async function getInvoiceFromLightningAddress(
  lud16: string,
  amountSats: number,
): Promise<string> {
  const [user, domain] = lud16.split('@');
  if (!user || !domain) throw new Error('Invalid lightning address format');

  const lnurlRes = await fetch(
    `https://${domain}/.well-known/lnurlp/${user}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!lnurlRes.ok) throw new Error(`LNURL fetch failed (${lnurlRes.status})`);

  const lnurlData = await lnurlRes.json();
  if (lnurlData.status === 'ERROR') throw new Error(lnurlData.reason);

  const amountMsats = amountSats * 1000;
  const min = lnurlData.minSendable ?? 1000;
  const max = lnurlData.maxSendable ?? 1_000_000_000_000;
  if (amountMsats < min || amountMsats > max) {
    throw new Error(`Amount ${amountSats} sats out of LNURL range (${min / 1000}–${max / 1000} sats)`);
  }

  const callbackRes = await fetch(`${lnurlData.callback}?amount=${amountMsats}`);
  if (!callbackRes.ok) throw new Error(`LNURL callback failed (${callbackRes.status})`);

  const callbackData = await callbackRes.json();
  if (callbackData.status === 'ERROR') throw new Error(callbackData.reason);
  if (!callbackData.pr) throw new Error('No invoice returned by lightning address');

  return callbackData.pr as string;
}
