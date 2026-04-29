import { NextResponse } from 'next/server';
import { makeInvoiceViaNwc } from '@/lib/nwc';

export const maxDuration = 15;

export async function GET() {
  const nwcString = process.env.NWC_CONNECTION_STRING;
  if (!nwcString) {
    return NextResponse.json({ error: 'Revival not configured on this server' }, { status: 503 });
  }

  try {
    const { invoice, paymentHash } = await makeInvoiceViaNwc(21, 'Tamagostrich revival', nwcString);
    return NextResponse.json({ invoice, paymentHash });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Could not generate invoice: ${msg}` }, { status: 502 });
  }
}
