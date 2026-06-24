import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/upload/delete
 * Deletes files from Supabase Storage.
 * Accepts JSON with:
 *   - paths: string[] — array of storage file paths to delete
 *
 * Returns JSON: { deleted: number, errors: string[] }
 */

const BUCKET_NAME = 'cefr-assets';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase sozlanmagan.' },
      { status: 500 }
    );
  }

  try {
    const { paths } = await request.json();

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: 'O\'chiriladigan fayllar ro\'yxati bo\'sh.' },
        { status: 400 }
      );
    }

    // Filter out empty strings
    const validPaths = paths.filter((p: string) => p && p.trim().length > 0);
    if (validPaths.length === 0) {
      return NextResponse.json({ deleted: 0, errors: [] });
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(validPaths);

    if (error) {
      console.error('Storage delete error:', error);
      return NextResponse.json(
        { error: `Fayllarni o'chirishda xatolik: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deleted: data?.length || 0,
      errors: [],
    });
  } catch (error: any) {
    console.error('Delete Route Error:', error);
    return NextResponse.json(
      { error: `So'rovda xatolik: ${error.message || 'Noma\'lum xatolik'}` },
      { status: 500 }
    );
  }
}
