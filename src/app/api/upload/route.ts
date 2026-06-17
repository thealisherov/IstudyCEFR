import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/upload
 * Generates a signed URL for client-side direct upload to Supabase Storage.
 * Accepts JSON with:
 *   - filename: string
 *   - folder: (optional) subfolder name, e.g. "audio" or "images"
 *   - contentType: string
 *
 * Returns JSON: { token: string, path: string, publicUrl: string }
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
      { error: 'Supabase sozlanmagan. .env.local fayliga SUPABASE_SERVICE_ROLE_KEY ni qo\'shing.' },
      { status: 500 }
    );
  }

  try {
    const { filename, folder = 'uploads', contentType } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: 'Fayl nomi kiritilmagan.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    ];

    if (contentType && !allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Ruxsat etilmagan fayl turi: ${contentType}. Faqat audio va rasm fayllari qabul qilinadi.` },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error('Signed URL Error:', error);
      return NextResponse.json(
        { error: `URL yaratishda xatolik: ${error?.message || 'Noma\'lum'}` },
        { status: 500 }
      );
    }

    // Build public URL string beforehand
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      token: data.token,
      path: filePath,
      publicUrl: publicUrlData?.publicUrl || '',
    });
  } catch (error: any) {
    console.error('Upload Route Error:', error);
    return NextResponse.json(
      { error: `So'rovda xatolik: ${error.message || 'Noma\'lum xatolik'}` },
      { status: 500 }
    );
  }
}
