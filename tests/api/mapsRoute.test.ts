import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/maps/route';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockRevalidateTag = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock('@/app/actions/mapActions', () => ({
  getVillageMapThemes: vi.fn().mockResolvedValue({
    mossy_hearth_village: { id: 'mossy_hearth_village', name: 'Mossy Hearth' },
  }),
}));

describe('GET & POST /api/maps Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns map themes', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.themes).toBeDefined();
  });

  it('POST rejects unauthenticated requests with 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const req = new NextRequest('http://localhost:3000/api/maps', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authentication required');
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('POST rejects non-admin authenticated users with 403', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user_citizen',
          app_metadata: { role: 'authenticated' },
          user_metadata: {},
        },
      },
      error: null,
    });

    const req = new NextRequest('http://localhost:3000/api/maps', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Administrative privileges required');
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('POST allows admin users and purges map & group caches', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user_admin',
          app_metadata: { role: 'admin' },
        },
      },
      error: null,
    });

    const req = new NextRequest('http://localhost:3000/api/maps', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockRevalidateTag).toHaveBeenCalledWith('village_map_themes', 'max');
    expect(mockRevalidateTag).toHaveBeenCalledWith('groups', 'max');
  });
});
