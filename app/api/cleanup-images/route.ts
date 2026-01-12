import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 이미지 정리 API
 * 주문 신청일(createdAt) 기준으로 21일 이상 된 주문의 이미지를 Supabase Storage에서 삭제합니다.
 * 
 * 이 API는 외부 Cron 서비스(예: cron-job.org, EasyCron 등)에서
 * 주기적으로 호출하거나, Railway/Vercel의 Cron 기능을 사용할 수 있습니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (보안을 위해 API 키 추가 권장)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 21일 전 날짜 계산
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 21);

    // 21일 이상 된 주문 조회 (imageUrls가 있는 주문만)
    const { data: oldOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, imageUrls, "createdAt"')
      .lt('createdAt', cutoffDate.toISOString())
      .not('imageUrls', 'is', null);

    if (ordersError) {
      console.error('Error fetching old orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    if (!oldOrders || oldOrders.length === 0) {
      return NextResponse.json({
        message: 'No orders to clean up',
        deletedCount: 0,
        cutoffDate: cutoffDate.toISOString()
      });
    }

    // 모든 이미지 URL 수집
    const imageUrls = new Set<string>();
    oldOrders.forEach(order => {
      if (order.imageUrls && Array.isArray(order.imageUrls)) {
        order.imageUrls.forEach(url => {
          if (url && typeof url === 'string') {
            imageUrls.add(url);
          }
        });
      }
    });

    // URL에서 파일 경로 추출 및 삭제
    let deletedCount = 0;
    const errors: string[] = [];
    const deletedPaths: string[] = [];

    for (const imageUrl of imageUrls) {
      try {
        // Supabase Storage URL에서 파일 경로 추출
        // 예: https://xxx.supabase.co/storage/v1/object/public/order-images/userId/filename.jpg
        // → userId/filename.jpg
        const urlMatch = imageUrl.match(/order-images\/(.+)$/);
        if (!urlMatch) {
          console.warn(`Could not extract path from URL: ${imageUrl}`);
          continue;
        }

        const filePath = urlMatch[1];
        
        // Storage에서 파일 삭제
        const { error: deleteError } = await supabaseAdmin.storage
          .from('order-images')
          .remove([filePath]);

        if (deleteError) {
          console.error(`Error deleting file ${filePath}:`, deleteError);
          errors.push(`${filePath}: ${deleteError.message}`);
        } else {
          deletedCount++;
          deletedPaths.push(filePath);
        }
      } catch (error: any) {
        console.error(`Error processing image ${imageUrl}:`, error);
        errors.push(`${imageUrl}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      deletedCount,
      processedOrders: oldOrders.length,
      totalImages: imageUrls.size,
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

