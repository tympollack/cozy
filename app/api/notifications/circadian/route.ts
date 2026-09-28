import { NextRequest, NextResponse } from 'next/server';
import { processCircadianNudgeScheduler } from '@/app/actions/notificationActions';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forcePhase = (searchParams.get('forcePhase') as 'light' | 'dark') || undefined;
    const targetUserId = searchParams.get('targetUserId') || undefined;
    const dryRun = searchParams.get('dryRun') === 'true';

    const result = await processCircadianNudgeScheduler({
      forcePhase,
      targetUserId,
      dryRun,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Circadian scheduler route error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: { forcePhase?: 'light' | 'dark'; targetUserId?: string; dryRun?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = await processCircadianNudgeScheduler(body);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Circadian scheduler route error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
