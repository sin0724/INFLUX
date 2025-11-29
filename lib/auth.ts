import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface Quota {
  follower?: { total: number; remaining: number };
  like?: { total: number; remaining: number };
  hotpost?: { total: number; remaining: number };
  momcafe?: { total: number; remaining: number };
  powerblog?: { total: number; remaining: number };
  clip?: { total: number; remaining: number };
  blog?: { total: number; remaining: number };
  receipt?: { total: number; remaining: number };
  daangn?: { total: number; remaining: number };
}

export interface User {
  id: string;
  username: string;
  companyName?: string;
  role: 'superadmin' | 'admin' | 'client';
  totalQuota?: number;
  remainingQuota?: number;
  quota?: Quota;
  contractStartDate?: string;
  contractEndDate?: string;
  isActive?: boolean;
  points?: number;
}

export interface Session {
  user: User;
  token: string;
}

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// 비밀번호 검증
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT 토큰 생성
export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// JWT 토큰 검증
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (error) {
    return null;
  }
}

// 세션 가져오기 (서버 컴포넌트)
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return null;
  }

  const user = verifyToken(token);
  if (!user) {
    return null;
  }

  // DB에서 최신 정보 가져오기
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  // 계약 만료 체크
  const now = new Date();
  const contractEndDate = data.contractEndDate ? new Date(data.contractEndDate) : null;
  const isExpired = contractEndDate && contractEndDate < now;
  const isActive = data.isActive !== false && !isExpired;

  return {
    user: {
      id: data.id,
      username: data.username,
      companyName: data.companyName,
      role: data.role,
      totalQuota: data.totalQuota,
      remainingQuota: data.remainingQuota,
      quota: data.quota || undefined,
      contractStartDate: data.contractStartDate,
      contractEndDate: data.contractEndDate,
      isActive,
      points: data.points || 0,
    },
    token,
  };
}

// 로그인
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  const isValid = await verifyPassword(password, data.password);
  if (!isValid) {
    return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  // 계약 만료 체크 (클라이언트만)
  const now = new Date();
  const contractEndDate = data.contractEndDate ? new Date(data.contractEndDate) : null;
  const isExpired = contractEndDate && contractEndDate < now;
  const isActive = data.isActive !== false && !isExpired;
  
  if (data.role === 'client' && (!isActive || isExpired)) {
    return { 
      success: false, 
      error: '계약이 만료되었거나 계정이 차단되었습니다. 관리자에게 문의해주세요.' 
    };
  }

  const user: User = {
    id: data.id,
    username: data.username,
    companyName: data.companyName,
    role: data.role,
    totalQuota: data.totalQuota,
    remainingQuota: data.remainingQuota,
    quota: data.quota || undefined,
    contractStartDate: data.contractStartDate,
    contractEndDate: data.contractEndDate,
    isActive,
  };

  const token = generateToken(user);

  return { success: true, user, token };
}

// 로그아웃
export function logout() {
  // 쿠키에서 토큰 제거는 클라이언트에서 처리
}

