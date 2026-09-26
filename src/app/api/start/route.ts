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
    const { fingerprint } = await req.json();
    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint missing' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Daha önceden ödül almış mı kontrol et
    const { data: existingWin } = await supabase
      .from('scores')
      .select('id')
      .eq('fingerprint', fingerprint)
      .eq('is_claimed', true)
      .single();

    if (existingWin) {
      return NextResponse.json({ error: 'Hakkınızı doldurdunuz.' }, { status: 403 });
    }

    const startTime = new Date().toISOString();
    // HMAC imzası, istemciye verilecek ve durdurmada istenecek
    const messageToSign = `${fingerprint}:${startTime}`;
    const hmacToken = await generateHMAC(messageToSign);

    const { data, error } = await supabase
      .from('active_games')
      .insert({
        fingerprint,
        start_time: startTime,
        hmac_token: hmacToken
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      gameId: data.id, 
      hmacToken,
      // We don't send startTime to client to prevent them from tampering, 
      // but they can track their own time
    });
  } catch (error: any) {
    console.error('Start API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
