import { NextResponse } from 'next/server';
import { getVillageMapThemes } from '@/app/actions/mapActions';
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

export async function POST() {
  try {
    revalidateTag('village_map_themes', 'max');
    revalidateTag('groups', 'max');
    return NextResponse.json({
      success: true,
      message: 'Village map themes cache revalidated.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
