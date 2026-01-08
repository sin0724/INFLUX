-- ============================================
-- 2단계: 그 광고주의 완료건 목록 보기
-- ============================================
-- 특정 광고주의 완료건만 확인합니다.
-- 결과에서 삭제할 주문의 '주문ID'를 확인하세요.
-- 주문ID는 '12345678-1234-1234-1234-123456789abc' 같은 긴 문자열입니다.

-- ============================================
-- 방법 1: 광고주 ID로 검색 (가장 정확함! 추천)
-- ============================================
-- ⚠️ 아래 '광고주ID_여기입력' 부분을 0단계나 1단계에서 확인한 광고주ID로 바꾸세요!
-- 광고주ID는 0단계/1단계 결과에서 확인할 수 있습니다.

SELECT 
    o.id AS 주문ID,           -- ⬅️ 이 전체 ID를 복사하세요! (긴 문자열)
    o."taskType" AS 작업유형,
    o."completedLink" AS 완료링크1,
    o."completedLink2" AS 완료링크2,
    o."createdAt" AS 등록일시,
    u.username AS 광고주명,
    u."companyName" AS 회사명
FROM 
    orders o
JOIN 
    users u ON o."clientId" = u.id
WHERE 
    o."clientId" = '광고주ID_여기입력'  -- ⬅️ 예: '12345678-1234-1234-1234-123456789abc'
    AND o.status IN ('done', 'published')
    AND (o."completedLink" IS NOT NULL OR o."completedLink2" IS NOT NULL)
ORDER BY 
    o."createdAt" DESC;

-- ============================================
-- 방법 2: 광고주명으로 검색
-- ============================================
-- 광고주 ID를 모르면 아래 쿼리를 사용하세요 (주석 해제 필요)
-- 정확한 광고주명을 입력하세요

/*
SELECT 
    o.id AS 주문ID,           -- ⬅️ 이 전체 ID를 복사하세요!
    o."taskType" AS 작업유형,
    o."completedLink" AS 완료링크1,
    o."completedLink2" AS 완료링크2,
    o."createdAt" AS 등록일시,
    u.username AS 광고주명,
    u."companyName" AS 회사명
FROM 
    orders o
JOIN 
    users u ON o."clientId" = u.id
WHERE 
    u.username ILIKE '%광고주명_여기입력%'  -- ⬅️ 예: '%국어하다논술교습소%'
    AND o.status IN ('done', 'published')
    AND (o."completedLink" IS NOT NULL OR o."completedLink2" IS NOT NULL)
ORDER BY 
    o."createdAt" DESC;
*/
