-- ============================================
-- 초기화 결과 확인 (모든 결과를 한 번에)
-- ============================================

-- 슈퍼 어드민 계정 상세 정보
SELECT 
  '슈퍼 어드민 계정' as 확인항목,
  username as 아이디,
  role as 역할,
  "isActive" as 활성화,
  "createdAt" as 생성일
FROM users 
WHERE username = 'admin' AND role = 'superadmin';

-- 전체 통계 (하나의 결과로 합치기)
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM admin_activity_logs) as total_logs;

