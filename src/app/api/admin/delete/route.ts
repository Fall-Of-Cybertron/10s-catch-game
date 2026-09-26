import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STAFF_PIN = process.env.STAFF_PIN || '1234';

export async function POST(req: Request) {
  try {
    const { scoreId, pin } = await req.json();

    if (!scoreId || !pin) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    if (pin !== STAFF_PIN) {
      return NextResponse.json({ error: 'Yanlış PIN (Yetkisiz Erişim)' }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', scoreId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Score Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
