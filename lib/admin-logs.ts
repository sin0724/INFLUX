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
  paramsOrAdminId:
    | {
        adminId: string;
        adminUsername: string;
        action: string;
        target_type: string;
        targetId?: string;
        details?: AdminLogDetails;
        ip_address?: string;
        user_agent?: string;
      }
    | string,
  adminUsernameOrParams?: string | NextRequest,
  action?: string,
  targetType?: string,
  targetId?: string,
  details?: AdminLogDetails,
  req?: NextRequest
): Promise<void> {
  try {
    let params: {
      adminId: string;
      adminUsername: string;
      action: string;
      target_type: string;
      targetId?: string;
      details?: AdminLogDetails;
      ip_address?: string;
      user_agent?: string;
    };

    // 새로운 객체 방식
    if (typeof paramsOrAdminId === 'object') {
      params = paramsOrAdminId;
    } else {
      // 기존 개별 파라미터 방식 (호환성 유지)
      const ipAddress =
        (req as NextRequest)?.headers.get('x-forwarded-for') ||
        (req as NextRequest)?.headers.get('x-real-ip') ||
        'unknown';
      const userAgent =
        (req as NextRequest)?.headers.get('user-agent') || 'unknown';

      params = {
        adminId: paramsOrAdminId,
        adminUsername: adminUsernameOrParams as string,
        action: action!,
        target_type: targetType!,
        targetId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
      };
    }

    const { error } = await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        adminId: params.adminId,
        adminUsername: params.adminUsername,
        action: params.action,
        target_type: params.target_type,
        targetId: params.targetId || null,
        details: params.details || {},
        ip_address: params.ip_address || 'unknown',
        user_agent: params.user_agent || 'unknown',
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
  
  // 포인트 관련
  APPROVE_POINT_CHARGE: 'approve_point_charge',
  REJECT_POINT_CHARGE: 'reject_point_charge',
  
  // 시스템 관련
  LOGIN: 'login',
  LOGOUT: 'logout',
} as const;

