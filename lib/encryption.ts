/**
 * 암호화/복호화 유틸리티
 * 네이버 비밀번호 등 민감한 정보를 암호화하여 저장
 */

import crypto from 'crypto';

// 환경 변수에서 암호화 키 가져오기
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * 암호화 키를 32바이트로 변환
 */
function getKey(): Buffer {
  // 키가 64자 hex 문자열이면 32바이트로 변환
  if (ENCRYPTION_KEY.length === 64) {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  // 그 외의 경우 SHA256으로 해시하여 32바이트 생성
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * 평문을 암호화
 */
export function encrypt(text: string): string {
  if (!text) {
    return '';
  }

  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // IV + Tag + 암호화된 텍스트를 결합
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('암호화 중 오류가 발생했습니다.');
  }
}

/**
 * 암호화된 텍스트를 복호화
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return '';
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // 기존 평문 데이터인 경우 그대로 반환 (마이그레이션 전 데이터)
      return encryptedText;
    }

    const [ivHex, tagHex, encrypted] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // 복호화 실패 시 원본 반환 (마이그레이션 전 데이터일 수 있음)
    return encryptedText;
  }
}

/**
 * 기존 평문 데이터를 암호화하여 반환 (마이그레이션용)
 */
export function encryptIfNeeded(text: string): string {
  if (!text) {
    return '';
  }

  // 이미 암호화된 형식인지 확인 (IV:Tag:Encrypted 형식)
  const parts = text.split(':');
  if (parts.length === 3) {
    // 이미 암호화된 경우 그대로 반환
    return text;
  }

  // 평문인 경우 암호화
  return encrypt(text);
}
