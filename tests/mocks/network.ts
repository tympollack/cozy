import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  // Mock Supabase Auth User Endpoint
  http.get('https://*/auth/v1/user', () => {
    return HttpResponse.json({
      id: 'test-user-id-123',
      email: 'test@cozy.local',
      role: 'authenticated',
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: { name: 'Test Cozy Citizen' },
      created_at: new Date().toISOString(),
    });
  }),

  // Mock Supabase REST Post query
  http.get('https://*/rest/v1/posts', () => {
    return HttpResponse.json([
      {
        id: 'post-123',
        user_id: 'test-user-id-123',
        light_img_url: 'https://assets.cozy.local/uploads/light.jpg',
        dark_img_url: 'https://assets.cozy.local/uploads/dark.jpg',
        obfuscated_location_hash: '9q8y',
        cheer_count: 5,
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Mock Postcard trigger / Lob API
  http.post('https://api.lob.com/v1/postcards', () => {
    return HttpResponse.json({
      id: 'psc_mock_123456789',
      description: 'Cozy House Verification Postcard',
      expected_delivery_date: '2026-09-01',
      status: 'rendered',
    });
  }),
];

export const server = setupServer(...handlers);
