-- ============================================
-- 1단계: 광고주 검색하기
-- ============================================
-- ⚠️ 검색 결과가 안 나오면 먼저 0단계 파일로 전체 광고주 목록을 확인하세요!
-- 
-- 검색 팁:
-- 1. 검색어는 일부만 입력해도 됩니다 (예: '국어' 또는 '논술'만 입력)
-- 2. 정확한 이름이 필요하면 0단계 파일로 전체 목록 확인
-- 3. 띄어쓰기가 있는지 확인 (예: '국어하다 논술교습소' vs '국어하다논술교습소')

SELECT 
    id AS 광고주ID,
    username AS 광고주명,
    "companyName" AS 회사명
FROM 
    users
WHERE 
    username ILIKE '%검색어_여기입력%'  -- ⬅️ 예: '%국어%' 또는 '%논술%' (일부만 입력해도 됨!)
    AND role = 'client'
ORDER BY 
    username;

-- ============================================
-- 🔍 방법 2: 여러 검색어로 찾기 (띄어쓰기 고려)
-- ============================================
-- 위 쿼리로 안 나오면 아래 쿼리를 사용하세요 (주석 해제 필요)
-- 띄어쓰기나 정확한 이름을 찾을 때 유용합니다

/*
SELECT 
    id AS 광고주ID,
    username AS 광고주명,
    "companyName" AS 회사명
FROM 
    users
WHERE 
    (
        username ILIKE '%검색어1%' OR  -- ⬅️ 예: '%국어%'
        username ILIKE '%검색어2%' OR  -- ⬅️ 예: '%논술%'
        "companyName" ILIKE '%검색어1%' OR  -- 회사명으로도 검색
        "companyName" ILIKE '%검색어2%'
    )
    AND role = 'client'
ORDER BY 
    username;
*/

-- ============================================
-- 🔍 방법 3: 완료건이 있는 광고주만 보기
-- ============================================
-- 위 방법들로 안 나오면, 완료건이 있는 광고주만 보는 아래 쿼리를 실행하세요
-- (주석 해제 필요)

/*
SELECT DISTINCT
    u.id AS 광고주ID,
    u.username AS 광고주명,
    u."companyName" AS 회사명
FROM 
    users u
WHERE 
    u.role = 'client'
    AND EXISTS (
        SELECT 1 FROM orders o 
        WHERE o."clientId" = u.id 
        AND o.status IN ('done', 'published')
        AND (o."completedLink" IS NOT NULL OR o."completedLink2" IS NOT NULL)
    )
ORDER BY 
    u.username;
*/
