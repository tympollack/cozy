// ---------------------------------------------------------------------------
// Error Classes & Types
// ---------------------------------------------------------------------------

export type DatabaseRole = 'anon' | 'authenticated' | 'service_role';

export class RLSPolicyViolationError extends Error {
  constructor(message = 'Row-Level Security (RLS) policy violation.') {
    super(message);
    this.name = 'RLSPolicyViolationError';
  }
}

export class VaultAccessViolationError extends Error {
  constructor(message = 'Access to private vault tables is forbidden.') {
    super(message);
    this.name = 'VaultAccessViolationError';
  }
}

export class RpcExecutionError extends Error {
  constructor(message = 'RPC execution failed.') {
    super(message);
    this.name = 'RpcExecutionError';
  }
}

export interface ClientContext {
  role: DatabaseRole;
  userId?: string;
}

export interface DbUser {
  id: string;
  email: string;
  points: number;
  role: string;
}

export interface DbPost {
  id: string;
  user_id: string;
  light_img_url: string;
  dark_img_url: string;
  obfuscated_location_hash?: string;
  cheer_count: number;
  claimed_by_user_id?: string | null;
}

export interface DbPostLocationVault {
  post_id: string;
  exact_lat: number;
  exact_lng: number;
  postcard_pin: string;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export interface DbCheer {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database Contract Harness
// ---------------------------------------------------------------------------

export class DatabaseContractHarness {
  public users = new Map<string, DbUser>();
  public posts = new Map<string, DbPost>();
  public vaultLocations = new Map<string, DbPostLocationVault>();
  public transactions: DbTransaction[] = [];
  public cheers: DbCheer[] = [];

  public seedUser(user: DbUser): void {
    this.users.set(user.id, { ...user });
  }

  public seedPost(post: DbPost): void {
    this.posts.set(post.id, { ...post });
  }

  public seedVaultLocation(location: DbPostLocationVault): void {
    this.vaultLocations.set(location.post_id, { ...location });
  }

  public getUser(userId: string): DbUser | null {
    return this.users.get(userId) ?? null;
  }

  public getTransactions(userId: string): DbTransaction[] {
    return this.transactions.filter((t) => t.user_id === userId);
  }

  public createClient(ctx: ClientContext) {
    return {
      from: (table: string) => {
        return new MockQueryBuilder(this, table, ctx);
      },
      rpc: async (
        procedure: string,
        params: Record<string, unknown>
      ): Promise<Record<string, unknown> | number> => {
        return this.executeRpc(procedure, params, ctx);
      },
    };
  }

  private async executeRpc(
    procedure: string,
    params: Record<string, unknown>,
    ctx: ClientContext
  ): Promise<Record<string, unknown> | number> {
    if (ctx.role === 'anon') {
      throw new RpcExecutionError('Authentication required for RPC stored procedures.');
    }

    if (procedure === 'cheer_post') {
      const postId = params.p_post_id as string;
      const userId = (params.p_user_id as string) || ctx.userId;

      const post = this.posts.get(postId);
      if (!post) {
        throw new RpcExecutionError(`Post ${postId} not found.`);
      }

      if (post.user_id === userId) {
        throw new RpcExecutionError('You cannot cheer your own post.');
      }

      const alreadyCheered = this.cheers.some((c) => c.post_id === postId && c.user_id === userId);
      if (alreadyCheered) {
        throw new RpcExecutionError('Unique constraint violation: Already cheered this post.');
      }

      this.cheers.push({
        id: `cheer_${Date.now()}`,
        post_id: postId,
        user_id: userId!,
        created_at: new Date().toISOString(),
      });

      post.cheer_count += 1;

      const author = this.users.get(post.user_id);
      if (author) {
        author.points += 1;
      }

      const cheeringUser = this.users.get(userId!);
      if (cheeringUser) {
        cheeringUser.points += 1;
      }

      return {
        personal_points: cheeringUser?.points ?? 1,
        groups_updated: 0,
      };
    }

    if (procedure === 'record_transaction') {
      const userId = (params.p_user_id as string) || ctx.userId!;
      const amount = params.p_amount as number;
      const pType = (params.p_type as string) || 'generic';
      const description = (params.p_description as string) || '';

      const user = this.users.get(userId);
      if (!user) {
        throw new RpcExecutionError(`User ${userId} not found.`);
      }

      if (amount < 0 && user.points + amount < 0) {
        throw new RpcExecutionError('Insufficient points to complete transaction.');
      }

      user.points += amount;
      this.transactions.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        amount,
        transaction_type: pType,
        description,
        created_at: new Date().toISOString(),
      });

      return user.points;
    }

    throw new RpcExecutionError(`Unknown RPC procedure: ${procedure}`);
  }
}

// ---------------------------------------------------------------------------
// Mock Chainable Query Builder (PromiseLike)
// ---------------------------------------------------------------------------

type OperationType = 'select' | 'insert' | 'update' | 'delete';

export class MockQueryBuilder implements PromiseLike<unknown> {
  private filters: { col: string; val: unknown }[] = [];
  private op: OperationType = 'select';
  private mutateData: Record<string, unknown> | null = null;
  private selectColumns = '*';

  constructor(
    private harness: DatabaseContractHarness,
    private table: string,
    private ctx: ClientContext
  ) {}

  public select(columns = '*'): this {
    this.op = 'select';
    this.selectColumns = columns;
    return this;
  }

  public insert(data: Record<string, unknown>): this {
    this.op = 'insert';
    this.mutateData = data;
    return this;
  }

  public update(data: Record<string, unknown>): this {
    this.op = 'update';
    this.mutateData = data;
    return this;
  }

  public eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  public async execute(): Promise<unknown> {
    if (this.op === 'select') {
      if (this.table === 'post_locations') {
        if (this.ctx.role !== 'service_role') {
          throw new VaultAccessViolationError('Vault table post_locations is protected.');
        }
        const records = Array.from(this.harness.vaultLocations.values());
        return this.applyFilters(records);
      }

      if (this.table === 'posts') {
        const records = Array.from(this.harness.posts.values());
        return this.applyFilters(records);
      }

      if (this.table === 'users') {
        const records = Array.from(this.harness.users.values());
        return this.applyFilters(records);
      }

      return [];
    }

    if (this.op === 'insert') {
      if (this.ctx.role === 'anon') {
        throw new RLSPolicyViolationError('Anon role cannot insert into tables.');
      }
      if (this.table === 'post_locations' && this.ctx.role !== 'service_role') {
        throw new VaultAccessViolationError('Direct insert into vault table forbidden.');
      }
      if (this.table === 'posts' && this.mutateData) {
        const post = this.mutateData as unknown as DbPost;
        this.harness.posts.set(post.id, post);
        return { success: true };
      }
      return { success: true };
    }

    if (this.op === 'update') {
      if (this.ctx.role === 'anon') {
        throw new RLSPolicyViolationError('Anon role cannot update tables.');
      }
      if (this.table === 'post_locations') {
        if (this.ctx.role !== 'service_role') {
          throw new VaultAccessViolationError('Direct mutation of vault table forbidden.');
        }
        const postId = this.filters.find((f) => f.col === 'post_id')?.val as string;
        if (postId) {
          const item = this.harness.vaultLocations.get(postId);
          if (item && this.mutateData) {
            Object.assign(item, this.mutateData);
          }
        }
        return { success: true };
      }

      if (this.table === 'posts') {
        const postId = this.filters.find((f) => f.col === 'id')?.val as string;
        const post = this.harness.posts.get(postId);
        if (!post) {
          throw new Error('Post not found');
        }

        if (this.ctx.role === 'authenticated' && post.user_id !== this.ctx.userId) {
          throw new RLSPolicyViolationError('Users can only update their own posts.');
        }

        if (this.mutateData) {
          Object.assign(post, this.mutateData);
        }
        return { success: true };
      }
      return { success: true };
    }

    return null;
  }

  public then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private applyFilters<T>(items: T[]): T[] {
    return items.filter((item) => {
      const record = item as Record<string, unknown>;
      return this.filters.every((filter) => record[filter.col] === filter.val);
    });
  }
}
