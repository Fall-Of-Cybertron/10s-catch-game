import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GAME_SECRET = process.env.GAME_SECRET_KEY || 'default-secret-key-change-in-prod';

async function generateHMAC(message: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(GAME_SECRET);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(req: Request) {
  try {
    const { fingerprint, nickname, stoppedTime, timeDiff, winToken } = await req.json();

    if (!fingerprint || !nickname || typeof stoppedTime !== 'number' || typeof timeDiff !== 'number' || !winToken) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
    }

    // Token Doğrulama
    const expectedMessage = `${fingerprint}:${stoppedTime}:${timeDiff}`;
    const expectedToken = await generateHMAC(expectedMessage);

    if (expectedToken !== winToken) {
      return NextResponse.json({ error: 'Geçersiz kazanma tokeni.' }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Aynı fingerprint ile zaten claimed olmuş skor var mı?
    const { data: existingWin } = await supabase
      .from('scores')
      .select('id')
      .eq('fingerprint', fingerprint)
      .eq('is_claimed', true)
      .single();

    if (existingWin) {
      return NextResponse.json({ error: 'Zaten bir ödül almışsınız.' }, { status: 403 });
    }

    // Skoru kaydet
    const { data: scoreData, error } = await supabase
      .from('scores')
      .insert({
        fingerprint,
        nickname: nickname.substring(0, 15), // Max 15 karakter
        stopped_time: stoppedTime,
        time_diff: timeDiff,
        is_claimed: false
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, scoreId: scoreData.id });

  } catch (error: any) {
    console.error('Save Score Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
