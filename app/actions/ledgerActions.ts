'use server';

import { createServerClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export interface LedgerHistoryResult {
  success: boolean;
  transactions: PointTransaction[];
  currentPoints: number;
  totalCount: number;
  hasMore: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// getTransactionHistory
// ---------------------------------------------------------------------------

/**
 * Queries cozy.point_transactions for the authenticated user ordered by created_at DESC.
 * Supports pagination via limit and offset.
 */
export async function getTransactionHistory(
  limit: number = 20,
  offset: number = 0
): Promise<LedgerHistoryResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      transactions: [],
      currentPoints: 0,
      totalCount: 0,
      hasMore: false,
      error: 'Authentication required to view transaction ledger.',
    };
  }

  try {
    // 1. Fetch current points balance
    const { data: userData } = await supabase
      .schema('cozy')
      .from('users')
      .select('points')
      .eq('id', user.id)
      .maybeSingle();

    const currentPoints = userData?.points ?? 0;

    // 2. Fetch paginated ledger transactions
    const safeLimit = Math.max(1, Math.min(100, limit));
    const safeOffset = Math.max(0, offset);

    const { data, count, error } = await supabase
      .schema('cozy')
      .from('point_transactions')
      .select('id, user_id, amount, transaction_type, description, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      // If table does not exist yet (local dev before migration), fallback gracefully
      console.warn('[getTransactionHistory] Ledger query warning:', error.message);
      return {
        success: true,
        transactions: [],
        currentPoints,
        totalCount: 0,
        hasMore: false,
      };
    }

    const transactions = (data || []) as PointTransaction[];
    const totalCount = count ?? transactions.length;
    const hasMore = safeOffset + transactions.length < totalCount;

    return {
      success: true,
      transactions,
      currentPoints,
      totalCount,
      hasMore,
    };
  } catch (err) {
    console.error('[getTransactionHistory] Unexpected error:', err);
    return {
      success: false,
      transactions: [],
      currentPoints: 0,
      totalCount: 0,
      hasMore: false,
      error: 'Failed to retrieve transaction history.',
    };
  }
}
