import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isProfane } from '@/lib/profanity';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Zorluk Seviyesi (Kazanma Toleransı)
// 0.015 = 15ms aşağı, 15ms yukarı (Toplam 30ms kazanma aralığı)
const WIN_TOLERANCE = 0.015;

export async function POST(req: Request) {
  try {
    const { gameId, hmacToken, clientDuration, fingerprint, nickname } = await req.json();

    if (!gameId || !hmacToken || typeof clientDuration !== 'number' || !fingerprint || !nickname) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
    }

    if (isProfane(nickname)) {
      return NextResponse.json({ error: 'Uygunsuz kelime kullanamazsınız.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Oyunu bul
    const { data: activeGame, error } = await supabase
      .from('active_games')
      .select('*')
      .eq('id', gameId)
      .eq('fingerprint', fingerprint)
      .single();

    if (error || !activeGame) {
      return NextResponse.json({ error: 'Oyun bulunamadı veya süresi doldu' }, { status: 404 });
    }

    // 2. Token doğrulama
    if (activeGame.hmac_token !== hmacToken) {
      return NextResponse.json({ error: 'Güvenlik ihlali: Geçersiz Token' }, { status: 403 });
    }

    // 3. Zaman denetimi (Ağ gecikmesi)
    const serverDurationMs = Date.now() - new Date(activeGame.start_time).getTime();
    const clientDurationMs = clientDuration * 1000;

    if (Math.abs(serverDurationMs - clientDurationMs) > 1000) {
       await supabase.from('active_games').delete().eq('id', gameId);
       return NextResponse.json({ error: 'Bağlantı gecikmesi/hile tespit edildi.' }, { status: 400 });
    }

    // Fark hesaplama
    const timeDiff = Math.abs(clientDuration - 10.00);
    const formattedDiff = parseFloat(timeDiff.toFixed(3));
    const isWin = formattedDiff <= WIN_TOLERANCE;

    await supabase.from('active_games').delete().eq('id', gameId);

    // 4. Skor Kaydetme Mantığı (Sadece en iyi skoru tutuyoruz)
    const { data: existingScore } = await supabase
      .from('scores')
      .select('*')
      .eq('fingerprint', fingerprint)
      .single();

    let scoreId = null;
    let isNewBest = false;
    let dbTimeDiff = formattedDiff;

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (existingScore) {
      scoreId = existingScore.id;
      // Eğer yeni skor daha iyiyse (10.00'a daha yakınsa) GÜNCELLE
      if (formattedDiff < existingScore.time_diff) {
        await supabase
          .from('scores')
          .update({ time_diff: formattedDiff, stopped_time: clientDuration, nickname: nickname.substring(0, 15), ip_address: ip, user_agent: userAgent })
          .eq('id', existingScore.id);
        isNewBest = true;
      } else {
        // Eski skor daha iyiydi, veritabanındaki diff'i baz alacağız sıralama için
        dbTimeDiff = existingScore.time_diff;
      }
    } else {
      // İlk defa oynuyor, YENİ KAYIT
      const { data: newScore } = await supabase
        .from('scores')
        .insert({
          fingerprint,
          nickname: nickname.substring(0, 15),
          stopped_time: clientDuration,
          time_diff: formattedDiff,
          is_claimed: false,
          ip_address: ip,
          user_agent: userAgent
        })
        .select('id')
        .single();
      
      scoreId = newScore!.id;
      isNewBest = true;
    }

    // 5. Sıralama (Rank) Hesaplama
    // Kendisinden DAHA İYİ (daha küçük time_diff) kaç kişi var buluyoruz
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .lt('time_diff', dbTimeDiff);

    const rank = (count || 0) + 1;

    return NextResponse.json({
      success: true,
      stoppedTime: clientDuration,
      timeDiff: formattedDiff,
      isWin,
      isNewBest,
      rank,
      scoreId
    });

  } catch (error: any) {
    console.error('Stop API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
