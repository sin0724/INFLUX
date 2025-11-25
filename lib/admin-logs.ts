/**
 * 관리자 활동 로그 유틸리티
 */

import { supabaseAdmin } from './supabase';
import { NextRequest } from 'next/server';

export interface AdminLogDetails {
  [key: string]: any;
}

/**
 * 관리자 활동 로그 기록
 */
export async function logAdminActivity(
  adminId: string,
  adminUsername: string,
  action: string,
  targetType: 'user' | 'order' | 'client' | 'admin' | 'system',
  targetId?: string,
  details?: AdminLogDetails,
  req?: NextRequest
): Promise<void> {
  try {
    const ipAddress = req?.headers.get('x-forwarded-for') || 
                      req?.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req?.headers.get('user-agent') || 'unknown';

    const { error } = await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        adminId,
        adminUsername,
        action,
        target_type: targetType,
        targetId: targetId || null,
        details: details || {},
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      console.error('Failed to log admin activity:', error);
      // 로그 기록 실패해도 메인 작업은 계속 진행
    }
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // 로그 기록 실패해도 메인 작업은 계속 진행
  }
}

/**
 * 주요 액션 타입 정의
 */
export const AdminActions = {
  // 사용자 관련
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  BLOCK_USER: 'block_user',
  ACTIVATE_USER: 'activate_user',
  EXTEND_CONTRACT: 'extend_contract',
  RENEW_CONTRACT: 'renew_contract',
  
  // 발주 관련
  UPDATE_ORDER_STATUS: 'update_order_status',
  DELETE_ORDER: 'delete_order',
  EDIT_ORDER: 'edit_order',
  
  // 관리자 관련
  CREATE_ADMIN: 'create_admin',
  UPDATE_ADMIN: 'update_admin',
  DELETE_ADMIN: 'delete_admin',
  
  // 시스템 관련
  LOGIN: 'login',
  LOGOUT: 'logout',
} as const;

