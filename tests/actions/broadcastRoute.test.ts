import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/notifications/broadcast/route';
import { NextRequest } from 'next/server';

const mockReceiveAdminBroadcast = vi.fn();

vi.mock('@/app/actions/notificationActions', () => ({
  receiveAdminBroadcast: (...args: unknown[]) => mockReceiveAdminBroadcast(...args),
}));

describe('POST /api/notifications/broadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully handles valid admin broadcast payload', async () => {
    mockReceiveAdminBroadcast.mockResolvedValue({
      success: true,
      count: 42,
    });

    const payload = {
      broadcast_id: 'broadcast-999',
      title: '🌟 Cozy Village Solstice Event',
      message: 'Join the cozy circle tonight at 8 PM UTC!',
      target_scope: 'all',
    };

    const req = new NextRequest('https://cozy.sunshade.icu/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.broadcast_id).toBe('broadcast-999');
    expect(data.count).toBe(42);
    expect(mockReceiveAdminBroadcast).toHaveBeenCalledWith({
      broadcast_id: 'broadcast-999',
      title: '🌟 Cozy Village Solstice Event',
      message: 'Join the cozy circle tonight at 8 PM UTC!',
      target_scope: 'all',
    });
  });

  it('rejects payload when required fields are missing', async () => {
    const payload = {
      title: 'Incomplete payload',
    };

    const req = new NextRequest('https://cozy.sunshade.icu/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/required/i);
  });

  it('returns 500 when receiveAdminBroadcast returns error', async () => {
    mockReceiveAdminBroadcast.mockResolvedValue({
      success: false,
      count: 0,
      error: 'Database connection failed',
    });

    const payload = {
      broadcast_id: 'b-fail',
      title: 'Fail test',
      message: 'Testing failure handling',
    };

    const req = new NextRequest('https://cozy.sunshade.icu/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database connection failed');
  });
});
