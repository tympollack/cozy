'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';

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

export interface RecordTransactionParams {
  userId: string;
  amount: number;
  transactionType: string;
  description: string;
}

// ---------------------------------------------------------------------------
// recordPointTransaction
// ---------------------------------------------------------------------------

/**
 * Appends a record to cozy.point_transactions for immutable auditing.
 * Uses the service client to ensure resilient write access regardless of client RLS.
 */
export async function recordPointTransaction({
  userId,
  amount,
  transactionType,
  description,
}: RecordTransactionParams): Promise<PointTransaction | null> {
  if (!userId) return null;

  try {
    const service = createServiceClient();
    const { data, error } = await service
      .schema('cozy')
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount,
        transaction_type: transactionType,
        description,
      })
      .select('id, user_id, amount, transaction_type, description, created_at')
      .single();

    if (error) {
      console.warn('[recordPointTransaction] Ledger insert notice:', error.message);
      return null;
    }

    return (data as PointTransaction) ?? null;
  } catch (err) {
    console.warn('[recordPointTransaction] Unexpected error recording transaction:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getTransactionHistory
// ---------------------------------------------------------------------------

/**
 * Queries cozy.point_transactions for the authenticated user ordered by created_at DESC.
 * Supports pagination via limit and offset.
 * Automatically backfills a genesis welcome bonus if the user has points but 0 recorded transactions.
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
    const service = createServiceClient();

    // 1. Fetch current points balance
    const { data: userData } = await service
      .schema('cozy')
      .from('users')
      .select('points')
      .eq('id', user.id)
      .maybeSingle();

    const currentPoints = userData?.points ?? 0;

    // 2. Fetch paginated ledger transactions using service client scoped strictly to authenticated user.id
    const safeLimit = Math.max(1, Math.min(100, limit));
    const safeOffset = Math.max(0, offset);

    const { data, count, error } = await service
      .schema('cozy')
      .from('point_transactions')
      .select('id, user_id, amount, transaction_type, description, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      console.warn('[getTransactionHistory] Ledger query warning:', error.message);
      return {
        success: true,
        transactions: [],
        currentPoints,
        totalCount: 0,
        hasMore: false,
      };
    }

    let transactions = (data || []) as PointTransaction[];
    let totalCount = count ?? transactions.length;

    // 3. Auto-populate initial balance genesis transaction if user has positive points but no transactions
    if (transactions.length === 0 && safeOffset === 0 && currentPoints > 0) {
      const genesisTx = await recordPointTransaction({
        userId: user.id,
        amount: currentPoints,
        transactionType: 'welcome_bonus',
        description: 'Cozy Welcome & Initial Balance',
      });

      if (genesisTx) {
        transactions = [genesisTx];
        totalCount = 1;
      }
    }

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

