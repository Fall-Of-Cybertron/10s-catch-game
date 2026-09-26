import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scoreId = searchParams.get('id');

    if (!scoreId) {
      return NextResponse.json({ error: 'Score ID missing' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Önce kullanıcının kendi time_diff değerini al
    const { data: userScore, error: scoreError } = await supabase
      .from('scores')
      .select('time_diff, created_at')
      .eq('id', scoreId)
      .single();

    if (scoreError || !userScore) {
      return NextResponse.json({ error: 'Score not found' }, { status: 404 });
    }

    // 2. Ondan daha iyi olan (daha küçük time_diff) veya eşit olup daha önce yapanların sayısını bul
    // COUNT sorgusu: time_diff < user_time_diff OR (time_diff = user_time_diff AND created_at < user_created_at)
    
    // Supabase JS ile karmaşık OR şartları yazmak için .or() kullanabiliriz, ama en kolayı PostgreSQL RPC yazmaktır.
    // Ancak RPC olmadan .or() ile de yapılabilir:
    const { count, error: countError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .or(`time_diff.lt.${userScore.time_diff},and(time_diff.eq.${userScore.time_diff},created_at.lt.${userScore.created_at})`);

    if (countError) throw countError;

    const rank = (count || 0) + 1;

    return NextResponse.json({ rank });

  } catch (error: any) {
    console.error('Rank API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
