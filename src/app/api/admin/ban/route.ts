import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STAFF_PIN = process.env.STAFF_PIN || '1234';

export async function POST(req: Request) {
  try {
    const { identifier, pin, type } = await req.json();

    if (!identifier || !pin) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    if (pin !== STAFF_PIN) {
      return NextResponse.json({ error: 'Yanlış PIN (Yetkisiz Erişim)' }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Ban listesine ekle
    const { error: banError } = await supabase
      .from('banned_users')
      .insert({ identifier, created_at: new Date().toISOString() });

    // Hata verse bile (zaten banlıysa) sorun yok, devam et
    
    // Eğer fingerprint ise bu kişinin tüm skorlarını da sil
    if (type === 'fingerprint') {
      await supabase.from('scores').delete().eq('fingerprint', identifier);
    } else if (type === 'ip') {
      await supabase.from('scores').delete().eq('ip_address', identifier);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ban Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
