import { NextResponse } from 'next/server';
import { getInvoiceFromLightningAddress } from '@/lib/lnurl';

export const maxDuration = 15;

export async function GET() {
  const lnAddress = process.env.REVIVAL_LNADDRESS;
  if (!lnAddress) {
    return NextResponse.json({ error: 'Revival not configured on this server' }, { status: 503 });
  }

  try {
    const invoice = await getInvoiceFromLightningAddress(lnAddress, 21);
    return NextResponse.json({ invoice });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Could not generate invoice: ${msg}` }, { status: 502 });
  }
}
