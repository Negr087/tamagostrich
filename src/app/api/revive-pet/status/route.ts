import { NextRequest, NextResponse } from 'next/server';
import { lookupInvoiceViaNwc } from '@/lib/nwc';

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get('hash');
  if (!hash) return NextResponse.json({ error: 'Missing hash' }, { status: 400 });

  const nwcString = process.env.NWC_CONNECTION_STRING;
  if (!nwcString) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { paid } = await lookupInvoiceViaNwc(hash, nwcString);
  return NextResponse.json({ paid });
}
