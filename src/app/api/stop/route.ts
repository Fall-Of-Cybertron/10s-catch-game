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
    const { gameId, hmacToken, clientDuration, fingerprint } = await req.json();

    if (!gameId || !hmacToken || typeof clientDuration !== 'number' || !fingerprint) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Oyunu veritabanından bul
    const { data: activeGame, error } = await supabase
      .from('active_games')
      .select('*')
      .eq('id', gameId)
      .eq('fingerprint', fingerprint)
      .single();

    if (error || !activeGame) {
      return NextResponse.json({ error: 'Oyun bulunamadı veya süresi doldu' }, { status: 404 });
    }

    // 2. Token doğrulaması
    if (activeGame.hmac_token !== hmacToken) {
      return NextResponse.json({ error: 'Güvenlik ihlali: Geçersiz Token' }, { status: 403 });
    }

    // 3. Hibrit Zaman Kontrolü (Ağ Gecikmesi Toleransı)
    const serverEndTime = Date.now();
    const serverStartTime = new Date(activeGame.start_time).getTime();
    const serverDurationMs = serverEndTime - serverStartTime;
    const clientDurationMs = clientDuration * 1000;

    // Eğer sunucu süresi ile istemci süresi arasındaki fark 800ms'den fazlaysa hile/kötü bağlantı
    const MAX_LATENCY_TOLERANCE = 800; // ms
    if (Math.abs(serverDurationMs - clientDurationMs) > MAX_LATENCY_TOLERANCE) {
       // active_games'ten sil
       await supabase.from('active_games').delete().eq('id', gameId);
       return NextResponse.json({ 
         error: 'Bağlantı gecikmesi veya hile tespit edildi.',
         serverDuration: serverDurationMs / 1000,
         clientDuration
       }, { status: 400 });
    }

    // Zaman farkını hesapla (10.00'a olan uzaklık)
    const timeDiff = Math.abs(clientDuration - 10.00);
    // Hassasiyeti 2 ondalık basamağa yuvarla
    const formattedDiff = parseFloat(timeDiff.toFixed(3));
    const isWin = formattedDiff <= 0.05;

    // Oyunu aktif oyunlardan kaldır
    await supabase.from('active_games').delete().eq('id', gameId);

    if (isWin) {
      // Kazanma durumunda, skoru kaydetmesi için bir winToken üret
      const winMessage = `${fingerprint}:${clientDuration}:${formattedDiff}`;
      const winToken = await generateHMAC(winMessage);

      return NextResponse.json({
        success: true,
        isWin: true,
        stoppedTime: clientDuration,
        timeDiff: formattedDiff,
        winToken
      });
    }

    return NextResponse.json({
      success: true,
      isWin: false,
      stoppedTime: clientDuration,
      timeDiff: formattedDiff
    });

  } catch (error: any) {
    console.error('Stop API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
