import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get('fingerprint');

    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint missing' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: score } = await supabase
      .from('scores')
      .select('time_diff, stopped_time')
      .eq('fingerprint', fingerprint)
      .single();

    if (!score) {
      return NextResponse.json({ hasScore: false });
    }

    const { count } = await supabase
      .from('scores')
      .select('id', { count: 'exact', head: true })
      .lt('time_diff', score.time_diff);

    return NextResponse.json({ 
      hasScore: true, 
      rank: (count || 0) + 1,
      timeDiff: score.time_diff
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
