import { NextRequest, NextResponse } from 'next/server';
import { getVillageMapThemes } from '@/app/actions/mapActions';
import { createServerClient } from '@/lib/supabase';
import { revalidateTag } from 'next/cache';

export async function GET() {
  try {
    const themesMap = await getVillageMapThemes();
    return NextResponse.json({
      success: true,
      themes: Object.values(themesMap),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Check authorization via Bearer token / Admin secret OR authenticated session
    const authHeader = req.headers.get('authorization');
    const adminSecret = process.env.ADMIN_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isSecretAuthorized = adminSecret && authHeader === `Bearer ${adminSecret}`;

    if (!isSecretAuthorized) {
      const supabase = await createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Authentication required to revalidate map cache.' },
          { status: 401 }
        );
      }
    }

    // 2. Perform tag revalidation (Next.js 16 revalidateTag contract requires cache life profile)
    revalidateTag('village_map_themes', 'max');
    revalidateTag('groups', 'max');

    return NextResponse.json({
      success: true,
      message: 'Village map themes cache successfully revalidated.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
