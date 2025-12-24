import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

async function uploadVideo(req: NextRequest, user: any) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `유효하지 않은 동영상 형식입니다. (${file.type}). 지원 형식: mp4, mpeg, mov, avi, webm` },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `동영상 크기는 100MB를 초과할 수 없습니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage (use admin client for permissions)
    // 동영상은 별도 버킷 또는 order-images 버킷 사용
    const { data, error } = await supabaseAdmin.storage
      .from('order-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return NextResponse.json(
        { error: `동영상 업로드에 실패했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '동영상 업로드 데이터를 받지 못했습니다.' },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('order-images').getPublicUrl(data.path);

    return NextResponse.json({
      url: publicUrl,
      path: data.path,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `동영상 업로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const POST = withAuth(uploadVideo, ['admin', 'client']);

