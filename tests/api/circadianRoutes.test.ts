import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getCircadian, POST as postCircadian } from '@/app/api/notifications/circadian/route';
import { POST as postPushSub, DELETE as deletePushSub } from '@/app/api/notifications/push/subscribe/route';
import * as notifActions from '@/app/actions/notificationActions';
import { NextRequest } from 'next/server';

vi.mock('@/app/actions/notificationActions', () => ({
  processCircadianNudgeScheduler: vi.fn(),
  savePushSubscriptionAction: vi.fn(),
  deletePushSubscriptionAction: vi.fn(),
}));

describe('/api/notifications/circadian', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET calls processCircadianNudgeScheduler with query parameters', async () => {
    vi.mocked(notifActions.processCircadianNudgeScheduler).mockResolvedValue({
      success: true,
      evaluatedUsers: 5,
      nudgedCount: 2,
      skippedCount: 3,
      phaseSummary: { light: 2, dark: 0 },
    });

    const req = new NextRequest('http://localhost:3000/api/notifications/circadian?forcePhase=light&dryRun=true');
    const res = await getCircadian(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(notifActions.processCircadianNudgeScheduler).toHaveBeenCalledWith({
      forcePhase: 'light',
      targetUserId: undefined,
      dryRun: true,
    });
  });

  it('POST calls processCircadianNudgeScheduler with body payload', async () => {
    vi.mocked(notifActions.processCircadianNudgeScheduler).mockResolvedValue({
      success: true,
      evaluatedUsers: 1,
      nudgedCount: 1,
      skippedCount: 0,
      phaseSummary: { light: 0, dark: 1 },
    });

    const req = new NextRequest('http://localhost:3000/api/notifications/circadian', {
      method: 'POST',
      body: JSON.stringify({ forcePhase: 'dark', targetUserId: 'user-1' }),
    });
    const res = await postCircadian(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nudgedCount).toBe(1);
    expect(notifActions.processCircadianNudgeScheduler).toHaveBeenCalledWith({
      forcePhase: 'dark',
      targetUserId: 'user-1',
    });
  });
});

describe('/api/notifications/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST saves push subscription with user-agent header', async () => {
    vi.mocked(notifActions.savePushSubscriptionAction).mockResolvedValue({
      success: true,
    });

    const req = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'user-agent': 'CozyTestBrowser/1.0' },
      body: JSON.stringify({ endpoint: 'https://push.service/sub123', keys: { auth: 'a', p256dh: 'p' } }),
    });

    const res = await postPushSub(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(notifActions.savePushSubscriptionAction).toHaveBeenCalledWith(
      { endpoint: 'https://push.service/sub123', keys: { auth: 'a', p256dh: 'p' } },
      'CozyTestBrowser/1.0'
    );
  });

  it('DELETE deletes push subscription by endpoint param', async () => {
    vi.mocked(notifActions.deletePushSubscriptionAction).mockResolvedValue({
      success: true,
    });

    const req = new NextRequest('http://localhost:3000/api/notifications/push/subscribe?endpoint=https://push.service/sub123', {
      method: 'DELETE',
    });

    const res = await deletePushSub(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(notifActions.deletePushSubscriptionAction).toHaveBeenCalledWith('https://push.service/sub123');
  });
});
