import { NextRequest, NextResponse } from 'next/server';
import { receiveAdminBroadcast, AdminBroadcastPayload } from '@/app/actions/notificationActions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { broadcast_id, title, message, target_scope } = body as Partial<AdminBroadcastPayload>;

    if (!broadcast_id || typeof broadcast_id !== 'string' || !title || typeof title !== 'string' || !message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid required fields: broadcast_id, title, and message are required strings.',
        },
        { status: 400 }
      );
    }

    const result = await receiveAdminBroadcast({
      broadcast_id: broadcast_id.trim(),
      title: title.trim(),
      message: message.trim(),
      target_scope: target_scope?.trim() || 'all',
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to dispatch broadcast alert.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        broadcast_id,
        count: result.count,
        message: `Successfully dispatched broadcast to ${result.count} cozy citizen(s).`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request body or server error.';
    console.error('[API /api/notifications/broadcast] Error:', message);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
