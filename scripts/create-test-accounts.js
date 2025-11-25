/**
 * 테스트 계정 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-test-accounts.js
 * 
 * 환경 변수 설정 필요:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL와 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestAccounts() {
  console.log('테스트 계정 생성을 시작합니다...\n');

  // 관리자 계정 생성
  const adminPassword = '1234';
  const adminHashedPassword = await bcrypt.hash(adminPassword, 10);

  const { data: adminData, error: adminError } = await supabase
    .from('users')
    .upsert({
      username: 'admin1',
      password: adminHashedPassword,
      role: 'admin',
      totalQuota: null,
      remainingQuota: null,
    }, {
      onConflict: 'username',
    })
    .select()
    .single();

  if (adminError) {
    console.error('관리자 계정 생성 실패:', adminError);
  } else {
    console.log('✅ 관리자 계정 생성 완료:');
    console.log('   아이디: admin1');
    console.log('   비밀번호: 1234\n');
  }

  // 광고주 계정 생성
  const clientPassword = '1234';
  const clientHashedPassword = await bcrypt.hash(clientPassword, 10);

  const { data: clientData, error: clientError } = await supabase
    .from('users')
    .upsert({
      username: 'testclient',
      password: clientHashedPassword,
      role: 'client',
      totalQuota: 10,
      remainingQuota: 10,
    }, {
      onConflict: 'username',
    })
    .select()
    .single();

  if (clientError) {
    console.error('광고주 계정 생성 실패:', clientError);
  } else {
    console.log('✅ 광고주 계정 생성 완료:');
    console.log('   아이디: testclient');
    console.log('   비밀번호: 1234');
    console.log('   총 작업 가능 갯수: 10건\n');
  }

  console.log('테스트 계정 생성이 완료되었습니다.');
}

createTestAccounts().catch(console.error);

