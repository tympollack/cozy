import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateVibeStatus, getPrivateNotes, sendPeerSupport } from '@/app/actions/vibeActions';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockServiceRpc = vi.fn();
let mockInsertedNotes: any[] = [];
let mockInsertedNotifications: any[] = [];
let mockUpdatedUsers: any[] = [];

let mockExistingNotifications: any[] = [];
let mockExistingPrivateNotes: any[] | null = null;

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
            eq: (col2: string, val2: unknown) => {
              const getData = () => {
                if (tableName === 'notifications') {
                  const filtered = mockExistingNotifications.filter((n) => {
                    const matches1 = (n as Record<string, unknown>)[col1] === val1;
                    const matches2 = (n as Record<string, unknown>)[col2] === val2;
                    return matches1 && matches2;
                  });
                  return { data: filtered, error: null };
                }
                return { data: [], error: null };
              };

              return {
                maybeSingle: () => {
                  if (tableName === 'group_members' && val2 === 'group-123') {
                    return Promise.resolve({ data: { group_id: 'group-123' }, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
                order: () => ({
                  limit: (lim: number) => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    then: (resolve: (v: unknown) => void) => {
                      const res = getData();
                      return Promise.resolve({ ...res, data: res.data?.slice(0, lim) }).then(resolve);
                    },
                  }),
                  then: (resolve: (v: unknown) => void) => Promise.resolve(getData()).then(resolve),
                }),
                limit: (lim: number) => ({
                  order: () => ({
                    then: (resolve: (v: unknown) => void) => {
                      const res = getData();
                      return Promise.resolve({ ...res, data: res.data?.slice(0, lim) }).then(resolve);
                    },
                  }),
                  then: (resolve: (v: unknown) => void) => {
                    const res = getData();
                    return Promise.resolve({ ...res, data: res.data?.slice(0, lim) }).then(resolve);
                  },
                }),
                then: (resolve: (v: unknown) => void) => Promise.resolve(getData()).then(resolve),
              };
            },
            gte: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
            order: () => {
              const getData = () => {
                if (tableName === 'private_notes') {
                  if (mockExistingPrivateNotes !== null) {
                    return { data: mockExistingPrivateNotes, error: null };
                  }
                  return {
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
                  };
                }
                if (tableName === 'notifications') {
                  const filtered = mockExistingNotifications.filter((n) => n.user_id === val1);
                  return { data: filtered, error: null };
                }
                return { data: [], error: null };
              };

              return {
                limit: (lim: number) => ({
                  maybeSingle: () => Promise.resolve({ data: { group_id: 'group-123' }, error: null }),
                  then: (resolve: (v: unknown) => void) => {
                    const res = getData();
                    return Promise.resolve({ ...res, data: res.data?.slice(0, lim) }).then(resolve);
                  },
                }),
                then: (resolve: (v: unknown) => void) => Promise.resolve(getData()).then(resolve),
              };
            },
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
    mockExistingPrivateNotes = null;
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

  it('updates vibe status to breezy and normalizes legacy breeze', async () => {
    const res = await updateVibeStatus('breezy');
    expect(res.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('update_vibe_status', {
      p_user_id: 'user-vibe-1',
      p_status: 'breezy',
    });

    const resBreeze = await updateVibeStatus('breeze' as any);
    expect(resBreeze.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('update_vibe_status', {
      p_user_id: 'user-vibe-1',
      p_status: 'breezy',
    });
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

  it('blocks unauthorized users from reading another user private notes', async () => {
    // Current user is user-vibe-1; trying to read user-other's notes
    const notes = await getPrivateNotes('user-other');
    expect(notes).toEqual([]);
  });

  it('blocks unauthenticated users from reading private notes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const notes = await getPrivateNotes('user-vibe-1');
    expect(notes).toEqual([]);
  });

  it('preserves distinct repeated notes sent during an outage without collapsing', async () => {
    mockExistingNotifications = [
      {
        id: 'notif-repeat-1',
        user_id: 'user-vibe-1',
        type: 'peer_checkin',
        metadata: {
          peer_id: 'sender-alex',
          sender_name: 'Alex',
          support_type: 'note',
          note_text: 'Thinking of you! 💛',
        },
        created_at: '2026-08-20T10:01:05.000Z',
      },
      {
        id: 'notif-repeat-2',
        user_id: 'user-vibe-1',
        type: 'peer_checkin',
        metadata: {
          peer_id: 'sender-alex',
          sender_name: 'Alex',
          support_type: 'note',
          note_text: 'Thinking of you! 💛',
        },
        created_at: '2026-08-20T10:01:45.000Z',
      },
    ];

    const notes = await getPrivateNotes('user-vibe-1');
    expect(notes).toHaveLength(3);
    const repeated = notes.filter((n) => n.message === 'Thinking of you! 💛');
    expect(repeated).toHaveLength(2);
    expect(repeated[0].id).toBe('notif-repeat-2');
    expect(repeated[1].id).toBe('notif-repeat-1');
  });

  it('merges mixed-store notes from private_notes and fallback notifications without losing earlier outage notes', async () => {
    mockExistingNotifications = [
      {
        id: 'notif-outage-1',
        user_id: 'user-vibe-1',
        type: 'peer_checkin',
        metadata: {
          peer_id: 'sender-outage',
          sender_name: 'Alex',
          support_type: 'note',
          note_text: 'Sent during outage! 🕯️',
        },
        created_at: '2026-08-20T10:00:00.000Z',
      },
    ];

    const notes = await getPrivateNotes('user-vibe-1');
    expect(notes).toHaveLength(2);
    // Newest note from primary private_notes table
    expect(notes[0].message).toBe('Sending you cozy vibes! ☕');
    // Outage note preserved from notifications table
    expect(notes[1].message).toBe('Sent during outage! 🕯️');
    expect(notes[1].senderName).toBe('Alex');
  });

  it('preserves full history when user has more than 50 notes, and supports optional limit/offset pagination', async () => {
    mockExistingPrivateNotes = Array.from({ length: 60 }, (_, i) => ({
      id: `note-${i}`,
      sender_id: `sender-${i}`,
      sender_name: `Neighbor ${i}`,
      recipient_id: 'user-vibe-1',
      message: `Warm note #${i}`,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }));

    // Calling without options returns all 60 notes (no artificial 50-item truncation)
    const allNotes = await getPrivateNotes('user-vibe-1');
    expect(allNotes).toHaveLength(60);

    // Calling with pagination returns the requested slice
    const page1 = await getPrivateNotes('user-vibe-1', { limit: 10, offset: 0 });
    expect(page1).toHaveLength(10);
    expect(page1[0].id).toBe('note-0');

    const page2 = await getPrivateNotes('user-vibe-1', { limit: 10, offset: 10 });
    expect(page2).toHaveLength(10);
    expect(page2[0].id).toBe('note-10');
  });

  it('does not hide outage notes when recipient receives unrelated non-note notifications', async () => {
    // 50 unrelated notifications (e.g. daily tasks) + 1 outage fallback note
    const nonNoteNotifs = Array.from({ length: 50 }, (_, i) => ({
      id: `task-${i}`,
      user_id: 'user-vibe-1',
      type: 'daily_task',
      metadata: { task_id: `t-${i}` },
      created_at: new Date(Date.now() - i * 60000).toISOString(),
    }));

    mockExistingNotifications = [
      ...nonNoteNotifs,
      {
        id: 'notif-outage-important',
        user_id: 'user-vibe-1',
        type: 'peer_checkin',
        metadata: {
          peer_id: 'sender-alex',
          sender_name: 'Alex',
          support_type: 'note',
          note_text: 'You got this! 🌟',
        },
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    const notes = await getPrivateNotes('user-vibe-1');
    const outageNote = notes.find((n) => n.id === 'notif-outage-important');
    expect(outageNote).toBeDefined();
    expect(outageNote?.message).toBe('You got this! 🌟');
  });

  it('preserves both legacy fallback note and primary note sent with identical text within the same minute', async () => {
    // Legacy fallback notification without note_id
    mockExistingNotifications = [
      {
        id: 'notif-legacy-1',
        user_id: 'user-vibe-1',
        type: 'peer_checkin',
        metadata: {
          peer_id: 'sender-alex',
          sender_name: 'Alex',
          support_type: 'note',
          note_text: 'Take care',
        },
        created_at: '2026-08-20T10:01:05.000Z',
      },
    ];

    // Primary note with exact same message sent in the same minute
    mockExistingPrivateNotes = [
      {
        id: 'note-primary-1',
        sender_id: 'sender-alex',
        sender_name: 'Alex',
        recipient_id: 'user-vibe-1',
        message: 'Take care',
        created_at: '2026-08-20T10:01:45.000Z',
      },
    ];

    const notes = await getPrivateNotes('user-vibe-1');
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.id)).toEqual(['note-primary-1', 'notif-legacy-1']);
  });

  it('sends peer support note with delivered_to_porch, seals preview, and does not leak note_text in notification metadata on success', async () => {
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
    expect(mockInsertedNotifications[0].message).toBe('Cozy Jordan left a warm note on your porch.');
    expect(mockInsertedNotifications[0].metadata).toMatchObject({
      note_id: expect.any(String),
      peer_id: 'user-vibe-1',
      sender_name: 'Cozy Jordan',
      support_type: 'note',
    });
    expect(mockInsertedNotifications[0].metadata.note_text).toBeUndefined();
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
