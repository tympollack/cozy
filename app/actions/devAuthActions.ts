'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { isBypassAuthEnabled, sanitizeNextUrl } from '@/lib/env';
import { headers } from 'next/headers';

export interface DevBypassResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Server action to immediately bypass login locally and authenticate as a test citizen.
 * Only allowed in local development, staging, or when NEXT_PUBLIC_BYPASS_AUTH is set.
 */
export async function devBypassLogin(
  targetEmail: string = 'chloe@cozy.test',
  returnUrl: string = '/feed'
): Promise<DevBypassResult> {
  let host = '';
  try {
    const headersList = await headers();
    host = headersList.get('x-forwarded-host') || headersList.get('host') || '';
  } catch {
    // Fallback if headers context is unavailable
  }

  if (!isBypassAuthEnabled(host)) {
    return {
      success: false,
      error: 'Dev bypass login is disabled in this environment.',
    };
  }


  const selectedEmail = targetEmail.trim().toLowerCase() || 'chloe@cozy.test';

  try {
    const serviceClient = createServiceClient();

    // 1. Generate magiclink token via Admin API
    let linkRes = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: selectedEmail,
    });

    // If user does not exist in Auth, auto-provision
    if (linkRes.error && linkRes.error.message.toLowerCase().includes('user not found')) {
      const displayName = selectedEmail.split('@')[0];
      const createRes = await serviceClient.auth.admin.createUser({
        email: selectedEmail,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });

      if (createRes.error) {
        return {
          success: false,
          error: `Failed to auto-create test user: ${createRes.error.message}`,
        };
      }

      linkRes = await serviceClient.auth.admin.generateLink({
        type: 'magiclink',
        email: selectedEmail,
      });
    }

    if (linkRes.error || !linkRes.data?.properties?.hashed_token) {
      return {
        success: false,
        error: linkRes.error?.message || 'Could not generate test authentication token.',
      };
    }

    // 2. Establish session via SSR client (sets response cookies)
    const supabase = await createServerClient();
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: linkRes.data.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyErr || !verifyData.user) {
      return {
        success: false,
        error: verifyErr?.message || 'Failed to initialize session for dev citizen.',
      };
    }

    return {
      success: true,
      redirectUrl: sanitizeNextUrl(returnUrl, '/feed'),
      user: {
        id: verifyData.user.id,
        email: verifyData.user.email,
      },
    };
  } catch (err: unknown) {
    console.error('[devBypassLogin] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during dev bypass login',
    };
  }
}
