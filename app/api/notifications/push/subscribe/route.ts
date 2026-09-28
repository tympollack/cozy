import { NextRequest, NextResponse } from 'next/server';
import {
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from '@/app/actions/notificationActions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userAgent = req.headers.get('user-agent') || undefined;

    if (!body || !body.endpoint) {
      return NextResponse.json(
        { success: false, error: 'Valid subscription with endpoint is required.' },
        { status: 400 }
      );
    }

    const result = await savePushSubscriptionAction(body, userAgent);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save push subscription.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint parameter is required.' },
        { status: 400 }
      );
    }

    const result = await deletePushSubscriptionAction(endpoint);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete push subscription.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
