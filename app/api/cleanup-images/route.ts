import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 이미지 정리 API
 * 2주(14일) 이상 된 이미지를 Supabase Storage에서 삭제합니다.
 * 
 * 이 API는 외부 Cron 서비스(예: cron-job.org, EasyCron 등)에서
 * 주기적으로 호출하거나, Railway/Vercel의 Cron 기능을 사용할 수 있습니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (선택사항 - 보안을 위해 API 키 추가 권장)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14); // 2주(14일) 전

    // Storage에서 모든 파일 목록 가져오기
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('order-images')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing files:', listError);
      return NextResponse.json(
        { error: 'Failed to list files', details: listError.message },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        message: 'No files to clean up',
        deletedCount: 0
      });
    }

    // 각 사용자 폴더별로 처리
    const userFolders = new Set<string>();
    files.forEach(file => {
      const parts = file.name.split('/');
      if (parts.length > 1) {
        userFolders.add(parts[0]);
      }
    });

    let deletedCount = 0;
    const errors: string[] = [];

    // 각 사용자 폴더의 파일 확인 및 삭제
    for (const folder of userFolders) {
      const { data: folderFiles, error: folderError } = await supabaseAdmin.storage
        .from('order-images')
        .list(folder, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (folderError) {
        console.error(`Error listing files in folder ${folder}:`, folderError);
        continue;
      }

      if (!folderFiles) continue;

      for (const file of folderFiles) {
        if (file.created_at) {
          const fileDate = new Date(file.created_at);
          
          // 14일 이상 된 파일 삭제
          if (fileDate < cutoffDate) {
            const filePath = `${folder}/${file.name}`;
            const { error: deleteError } = await supabaseAdmin.storage
              .from('order-images')
              .remove([filePath]);

            if (deleteError) {
              console.error(`Error deleting file ${filePath}:`, deleteError);
              errors.push(`${filePath}: ${deleteError.message}`);
            } else {
              deletedCount++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      cutoffDate: cutoffDate.toISOString()
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET 요청으로도 실행 가능 (테스트용)
export async function GET(request: NextRequest) {
  return POST(request);
}

