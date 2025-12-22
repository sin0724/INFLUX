import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * 안전하게 날짜 문자열을 Date 객체로 파싱합니다.
 * YYYY-MM-DD 형식 또는 ISO 형식의 문자열을 받아 Date 객체로 변환합니다.
 * @param dateString 날짜 문자열 (YYYY-MM-DD 형식)
 * @returns 유효한 Date 객체 또는 null (파싱 실패 시)
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    // YYYY-MM-DD 형식인지 확인
    const ymdMatch = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1; // 월은 0부터 시작
      const day = parseInt(ymdMatch[3], 10);
      const date = new Date(year, month, day);
      
      // 유효성 검사: 파싱된 값이 원본과 일치하는지 확인
      if (date.getFullYear() === year && 
          date.getMonth() === month && 
          date.getDate() === day &&
          !isNaN(date.getTime())) {
        return date;
      }
    }
    
    // ISO 형식 시도 (예: 2024-01-01T00:00:00.000Z)
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * 안전하게 날짜를 한국어 형식으로 포맷팅합니다.
 * @param date Date 객체 또는 날짜 문자열
 * @returns 포맷된 날짜 문자열 또는 '날짜 형식 오류'
 */
export function formatDateSafe(date: Date | string | null | undefined): string {
  if (!date) return '미설정';
  
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '날짜 형식 오류';
  }
  
  try {
    return dateObj.toLocaleDateString('ko-KR');
  } catch {
    return '날짜 형식 오류';
  }
}

/**
 * 숫자를 천 단위 구분자(콤마)가 있는 문자열로 포맷팅합니다.
 * @param num 포맷팅할 숫자
 * @returns 포맷팅된 문자열 (예: 1234 -> "1,234")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('ko-KR');
}

