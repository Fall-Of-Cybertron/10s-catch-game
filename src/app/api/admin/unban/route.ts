import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STAFF_PIN = process.env.STAFF_PIN || '1234';

export async function POST(req: Request) {
  try {
    const { identifier, pin } = await req.json();

    if (!identifier || !pin) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    if (pin !== STAFF_PIN) {
      return NextResponse.json({ error: 'Yanlış PIN (Yetkisiz Erişim)' }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error } = await supabase
      .from('banned_users')
      .delete()
      .eq('identifier', identifier);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unban Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get('pin');

    if (pin !== STAFF_PIN) {
      return NextResponse.json({ error: 'Yanlış PIN' }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('banned_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Fetch Bans Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
