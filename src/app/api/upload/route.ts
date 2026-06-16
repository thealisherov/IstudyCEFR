import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/upload
 * Uploads a file (audio or image) to Supabase Storage.
 * Accepts multipart/form-data with:
 *   - file: File blob
 *   - folder: (optional) subfolder name, e.g. "audio" or "images"
 *
 * Returns JSON: { url: string } — the public URL of the uploaded file.
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'Fayl tanlanmagan.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Ruxsat etilmagan fayl turi: ${file.type}. Faqat audio va rasm fayllari qabul qilinadi.` },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Fayl hajmi 50MB dan oshmasligi kerak.' },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      return NextResponse.json(
        { error: `Yuklashda xatolik: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Build public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrlData?.publicUrl || '',
      key: filePath,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: `Yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}` },
      { status: 500 }
    );
  }
}
