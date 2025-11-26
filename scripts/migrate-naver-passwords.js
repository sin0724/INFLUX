/**
 * 네이버 비밀번호 암호화 마이그레이션 스크립트
 * 
 * 사용법:
 * node scripts/migrate-naver-passwords.js
 * 
 * 주의: 환경 변수 ENCRYPTION_KEY가 설정되어 있어야 합니다.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL와 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.');
  process.exit(1);
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey() {
  if (ENCRYPTION_KEY.length === 64) {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

function encrypt(text) {
  if (!text) return '';
  
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

function isEncrypted(text) {
  if (!text) return false;
  const parts = text.split(':');
  return parts.length === 3;
}

async function migrate() {
  console.log('🔄 네이버 비밀번호 암호화 마이그레이션 시작...\n');

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 평문 비밀번호가 있는 사용자 조회
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, username, "naverPassword"')
    .not('naverPassword', 'is', null)
    .neq('naverPassword', '');

  if (fetchError) {
    console.error('❌ 사용자 조회 실패:', fetchError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('✅ 암호화할 비밀번호가 없습니다.');
    return;
  }

  console.log(`📋 총 ${users.length}명의 네이버 비밀번호를 확인합니다.\n`);

  let encryptedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    const password = user.naverPassword;

    // 이미 암호화된 경우 건너뛰기
    if (isEncrypted(password)) {
      console.log(`⏭️  ${user.username}: 이미 암호화됨`);
      skippedCount++;
      continue;
    }

    try {
      // 암호화
      const encrypted = encrypt(password);

      // 업데이트
      const { error: updateError } = await supabase
        .from('users')
        .update({ naverPassword: encrypted })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ ${user.username}: 업데이트 실패 -`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ ${user.username}: 암호화 완료`);
        encryptedCount++;
      }
    } catch (error) {
      console.error(`❌ ${user.username}: 암호화 실패 -`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 마이그레이션 결과:');
  console.log(`   ✅ 암호화: ${encryptedCount}개`);
  console.log(`   ⏭️  건너뜀: ${skippedCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);
  console.log(`\n🎉 마이그레이션 완료!`);
}

migrate().catch((error) => {
  console.error('❌ 마이그레이션 중 오류:', error);
  process.exit(1);
});
