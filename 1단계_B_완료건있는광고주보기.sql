-- ============================================
-- 1단계 B: 완료건이 있는 광고주만 보기
-- ============================================
-- 일반 검색으로 광고주를 찾지 못했을 때 사용하세요!
-- 완료건이 등록된 광고주만 표시됩니다.

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
