import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateVibeStatus, getPrivateNotes, sendPeerSupport } from '@/app/actions/vibeActions';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockServiceRpc = vi.fn();
let mockInsertedNotes: any[] = [];
let mockInsertedNotifications: any[] = [];
let mockUpdatedUsers: any[] = [];

let mockExistingNotifications: any[] = [];

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    schema: () => ({
      rpc: (...args: unknown[]) => mockRpc(...args),
    }),
  }),
  createServiceClient: () => ({
    schema: () => ({
      rpc: (...args: unknown[]) => mockServiceRpc(...args),
      from: (tableName: string) => ({
        select: () => ({
          eq: (col1: string, val1: unknown) => ({
            contains: (colMeta: string, metaObj: any) => ({
              gte: (colTime: string, timeVal: string) => ({
                order: (colOrder: string, orderOpts: any) => ({
                  limit: (num: number) => {
                    const filtered = mockExistingNotifications.filter((n) => {
                      const matchesType = n.type === val1;
                      const matchesMeta = n.metadata?.target_user_id === metaObj?.target_user_id;
                      const matchesGte = !timeVal || (n[colTime] && n[colTime] >= timeVal);
                      return matchesType && matchesMeta && matchesGte;
                    });
                    if (orderOpts?.ascending === false) {
                      filtered.sort((a, b) => (b[colOrder] || '').localeCompare(a[colOrder] || ''));
                    } else {
                      filtered.sort((a, b) => (a[colOrder] || '').localeCompare(b[colOrder] || ''));
                    }
                    return Promise.resolve({
                      data: filtered.slice(0, num),
                      error: null,
                    });
                  },
                }),
              }),
            }),
            single: () => {
              if (tableName === 'users') {
                return Promise.resolve({ data: { id: val1, points: 10, display_name: 'Cozy Jordan' }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
            maybeSingle: () => {
              if (tableName === 'users') {
                return Promise.resolve({ data: { id: val1, points: 10, vibe_status: 'neutral' }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
            eq: (col2: string, val2: unknown) => ({
              maybeSingle: () => {
                if (tableName === 'group_members' && val2 === 'group-123') {
                  return Promise.resolve({ data: { group_id: 'group-123' }, error: null });
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
            gte: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: { group_id: 'group-123' }, error: null }),
              }),
              then: (resolve: (v: unknown) => void) => {
                if (tableName === 'private_notes') {
                  return Promise.resolve({
                    data: [
                      {
                        id: 'note-1',
                        sender_id: 'sender-1',
                        sender_name: 'Robin',
                        recipient_id: val1,
                        message: 'Sending you cozy vibes! ☕',
                        created_at: new Date().toISOString(),
                        delivered_to_porch: true,
                      },
                    ],
                    error: null,
                  }).then(resolve);
                }
                return Promise.resolve({ data: [], error: null }).then(resolve);
              },
            }),
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: { group_id: 'group-123' }, error: null }),
            }),
          }),
        }),
        insert: (records: any) => {
          if (tableName === 'private_notes') {
            mockInsertedNotes.push(records);
          }
          if (tableName === 'notifications') {
            const arr = Array.isArray(records) ? records : [records];
            mockInsertedNotifications.push(...arr);
          }
          return Promise.resolve({ error: null });
        },
        update: (updates: any) => ({
          eq: (col: string, val: unknown) => {
            mockUpdatedUsers.push({ col, val, updates });
            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
    }),
  }),
}));

describe('Atmospheric Vibe Actions (vibeActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertedNotes = [];
    mockInsertedNotifications = [];
    mockUpdatedUsers = [];
    mockExistingNotifications = [];
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-vibe-1' } }, error: null });
    mockRpc.mockResolvedValue({
      data: [{ peer_user_id: 'peer-1', peer_name: 'Jordan' }],
      error: null,
    });
    mockServiceRpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('updates vibe status to sunshine', async () => {
    const res = await updateVibeStatus('sunshine');
    expect(res.success).toBe(true);
    expect(res.groupPeers).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledWith('update_vibe_status', {
      p_user_id: 'user-vibe-1',
      p_status: 'sunshine',
    });
    expect(mockServiceRpc).not.toHaveBeenCalled();
  });

  it('updates vibe status to raincloud and triggers process_notification_waterfall RPC for verified group', async () => {
    const res = await updateVibeStatus('raincloud', 'group-123');
    expect(res.success).toBe(true);
    expect(mockServiceRpc).toHaveBeenCalledWith('process_notification_waterfall', {
      p_target_user_id: 'user-vibe-1',
      p_group_id: 'group-123',
      p_status: 'raincloud',
      p_severity: 2,
      p_notify_anchor: true,
      p_quiet_mode: false,
    });
  });

  it('falls back to process_raincloud_waterfall when process_notification_waterfall fails', async () => {
    mockServiceRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'process_notification_waterfall') {
        return Promise.resolve({ data: null, error: { message: 'RPC not found' } });
      }
      return Promise.resolve({ data: { success: true }, error: null });
    });

    const res = await updateVibeStatus('raincloud', 'group-123');
    expect(res.success).toBe(true);
    expect(mockServiceRpc).toHaveBeenCalledWith('process_raincloud_waterfall', {
      p_target_user_id: 'user-vibe-1',
      p_group_id: 'group-123',
    });
  });

  it('rejects unverified group ID and falls back to user verified group membership', async () => {
    const res = await updateVibeStatus('raincloud', 'group-unauthorized');
    expect(res.success).toBe(true);
    expect(mockServiceRpc).toHaveBeenCalledWith('process_notification_waterfall', {
      p_target_user_id: 'user-vibe-1',
      p_group_id: 'group-123',
      p_status: 'raincloud',
      p_severity: 2,
      p_notify_anchor: true,
      p_quiet_mode: false,
    });
  });

  it('fetches private notes delivered to porch', async () => {
    const notes = await getPrivateNotes('user-vibe-1');
    expect(notes).toHaveLength(1);
    expect(notes[0].message).toBe('Sending you cozy vibes! ☕');
    expect(notes[0].senderName).toBe('Robin');
  });

  it('sends peer support note with delivered_to_porch and notifies recipient', async () => {
    const res = await sendPeerSupport('user-peer-2', 'note', {
      noteText: 'Here is some cozy sunshine for your day!',
    });
    expect(res.success).toBe(true);
    expect(mockInsertedNotes).toHaveLength(1);
    expect(mockInsertedNotes[0].delivered_to_porch).toBe(true);
    expect(mockInsertedNotes[0].message).toBe('Here is some cozy sunshine for your day!');

    expect(mockInsertedNotifications).toHaveLength(1);
    expect(mockInsertedNotifications[0].user_id).toBe('user-peer-2');
    expect(mockInsertedNotifications[0].type).toBe('peer_checkin');
    expect(mockInsertedNotifications[0].title).toContain('Private Supportive Note');
  });

  it('sends warm brew peer support, rewards points and notifies recipient', async () => {
    const res = await sendPeerSupport('user-peer-2', 'brew');
    expect(res.success).toBe(true);
    expect(res.senderPoints).toBe(15);
    expect(mockInsertedNotifications).toHaveLength(1);
    expect(mockInsertedNotifications[0].title).toContain('Warm Brew Delivered');
  });

  it('rejects sending note peer support if noteText is empty or whitespace', async () => {
    const resEmpty = await sendPeerSupport('user-peer-2', 'note', { noteText: '' });
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.error).toMatch(/Please write a warm note before sending/i);

    const resWhitespace = await sendPeerSupport('user-peer-2', 'note', { noteText: '   ' });
    expect(resWhitespace.success).toBe(false);
    expect(resWhitespace.error).toMatch(/Please write a warm note before sending/i);
    expect(mockInsertedNotes).toHaveLength(0);
    expect(mockInsertedNotifications).toHaveLength(0);
  });

  it('deduplicates waterfall when a waterfall notification was already triggered today', async () => {
    mockExistingNotifications = [
      {
        id: 'notif-wf-today',
        type: 'peer_checkin',
        metadata: {
          target_user_id: 'user-vibe-1',
          source: 'waterfall',
        },
        created_at: new Date().toISOString(),
      },
    ];

    const res = await updateVibeStatus('raincloud', 'group-123');
    expect(res.success).toBe(true);
    // Because hasTriggeredToday is true, neither RPC waterfall should be dispatched
    expect(mockServiceRpc).not.toHaveBeenCalled();
  });

  it('does not suppress waterfall if notifications for this user are only peer support deliveries', async () => {
    mockExistingNotifications = [
      {
        id: 'notif-support-today',
        type: 'peer_checkin',
        metadata: {
          target_user_id: 'user-vibe-1',
          peer_id: 'user-vibe-1',
          support_type: 'brew',
        },
        created_at: new Date().toISOString(),
      },
    ];

    const res = await updateVibeStatus('raincloud', 'group-123');
    expect(res.success).toBe(true);
    expect(mockServiceRpc).toHaveBeenCalledWith('process_notification_waterfall', {
      p_target_user_id: 'user-vibe-1',
      p_group_id: 'group-123',
      p_status: 'raincloud',
      p_severity: 2,
      p_notify_anchor: true,
      p_quiet_mode: false,
    });
  });

  it('does not deduplicate waterfall if existing waterfall notification was from yesterday', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T12:00:00Z'));

    mockExistingNotifications = [
      {
        id: 'notif-yesterday',
        type: 'peer_checkin',
        metadata: {
          target_user_id: 'user-vibe-1',
          source: 'waterfall',
        },
        created_at: '2026-08-27T18:00:00Z', // yesterday
      },
    ];

    const res = await updateVibeStatus('raincloud', 'group-123', 0);
    expect(res.success).toBe(true);
    expect(mockServiceRpc).toHaveBeenCalledWith('process_notification_waterfall', {
      p_target_user_id: 'user-vibe-1',
      p_group_id: 'group-123',
      p_status: 'raincloud',
      p_severity: 2,
      p_notify_anchor: true,
      p_quiet_mode: false,
    });

    vi.useRealTimers();
  });

  it('accepts clientOffsetMinutes to calculate local midnight for deduplication across timezone boundaries', async () => {
    vi.useFakeTimers();
    // System time: 2026-08-28 02:00:00 UTC
    // In UTC-4 (offset: -240): local time is 2026-08-27 22:00:00 (August 27th local day)
    // Local day start: 2026-08-27T00:00:00 local = 2026-08-27T04:00:00.000Z
    vi.setSystemTime(new Date('2026-08-28T02:00:00Z'));

    // Notification A: Aug 27 03:00 UTC (before local midnight Aug 27 04:00 UTC -> previous day local)
    mockExistingNotifications = [
      {
        id: 'notif-prev-local-day',
        type: 'peer_checkin',
        metadata: {
          target_user_id: 'user-vibe-1',
          source: 'waterfall',
        },
        created_at: '2026-08-27T03:00:00.000Z',
      },
    ];

    const resBeforeLocalDay = await updateVibeStatus('raincloud', 'group-123', -240);
    expect(resBeforeLocalDay.success).toBe(true);
    expect(mockServiceRpc).toHaveBeenCalledWith('process_notification_waterfall', {
      p_target_user_id: 'user-vibe-1',
      p_group_id: 'group-123',
      p_status: 'raincloud',
      p_severity: 2,
      p_notify_anchor: true,
      p_quiet_mode: false,
    });

    mockServiceRpc.mockClear();

    // Notification B: Aug 27 05:00 UTC (after local midnight Aug 27 04:00 UTC -> today local!)
    mockExistingNotifications = [
      {
        id: 'notif-today-local-day',
        type: 'peer_checkin',
        metadata: {
          target_user_id: 'user-vibe-1',
          source: 'waterfall',
        },
        created_at: '2026-08-27T05:00:00.000Z',
      },
    ];

    const resTodayLocalDay = await updateVibeStatus('raincloud', 'group-123', -240);
    expect(resTodayLocalDay.success).toBe(true);
    // Suppressed because it triggered earlier today in the user's local timezone
    expect(mockServiceRpc).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
