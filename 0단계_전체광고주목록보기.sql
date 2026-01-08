-- ============================================
-- 0단계: 전체 광고주 목록 보기
-- ============================================
-- 이 파일을 먼저 실행하세요!
-- 광고주명을 모를 때, 전체 광고주 목록을 확인합니다.

-- ============================================
-- 방법 1: 전체 광고주 목록 보기
-- ============================================
SELECT 
    id AS 광고주ID,
    username AS 광고주명,
    "companyName" AS 회사명
FROM 
    users
WHERE 
    role = 'client'
ORDER BY 
    username;

-- ============================================
-- 방법 2: 목록에서 특정 광고주 검색하기
-- ============================================
-- 전체 목록이 너무 많으면 아래 쿼리를 사용하세요
-- 주석을 해제하고 검색어를 입력한 뒤 실행하세요
-- 
-- 사용법:
-- 1. 아래 /* 와 */ 사이의 주석을 지우세요
-- 2. '%검색어%' 부분을 실제 검색어로 바꾸세요
-- 3. 실행하세요

/*
SELECT 
    id AS 광고주ID,
    username AS 광고주명,
    "companyName" AS 회사명
FROM 
    users
WHERE 
    role = 'client'
    AND (
        username ILIKE '%검색어_여기입력%' OR  -- 광고주명으로 검색
        "companyName" ILIKE '%검색어_여기입력%'  -- 회사명으로도 검색
    )
ORDER BY 
    username;
*/

-- 예시: '국어'라는 단어가 포함된 광고주 찾기
/*
SELECT 
    id AS 광고주ID,
    username AS 광고주명,
    "companyName" AS 회사명
FROM 
    users
WHERE 
    role = 'client'
    AND (
        username ILIKE '%국어%' OR
        "companyName" ILIKE '%국어%'
    )
ORDER BY 
    username;
*/
