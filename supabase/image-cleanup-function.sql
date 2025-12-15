-- 이미지 자동 삭제 함수 (2주 이상 된 이미지 삭제)
-- 이 함수는 Supabase Storage에서 2주(14일) 이상 된 이미지를 자동으로 삭제합니다.

-- 함수 생성: 2주 이상 된 이미지 삭제
CREATE OR REPLACE FUNCTION cleanup_old_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 2주(14일) 전 날짜 계산
  cutoff_date := NOW() - INTERVAL '14 days';
  
  -- Storage에서 오래된 파일 찾기 및 삭제
  -- storage.objects 테이블에서 created_at이 cutoff_date보다 오래된 파일 삭제
  FOR file_record IN
    SELECT name, bucket_id
    FROM storage.objects
    WHERE bucket_id = 'order-images'
      AND created_at < cutoff_date
  LOOP
    -- 파일 삭제 (Service Role 권한 필요)
    PERFORM storage.objects_delete('order-images', file_record.name);
    deleted_count := deleted_count + 1;
  END LOOP;
  
  -- 로그 출력 (선택사항)
  RAISE NOTICE 'Deleted % old images older than 14 days', deleted_count;
END;
$$;

-- pg_cron 확장 활성화 (Supabase Pro 이상 필요)
-- 주의: 무료 플랜에서는 pg_cron을 사용할 수 없으므로, 
-- 대신 Edge Function이나 외부 Cron 서비스를 사용해야 합니다.

-- pg_cron으로 매일 자정에 실행하도록 스케줄 설정
-- SELECT cron.schedule(
--   'cleanup-old-images',           -- 작업 이름
--   '0 0 * * *',                    -- 매일 자정 (cron 형식)
--   $$SELECT cleanup_old_images()$$ -- 실행할 함수
-- );

-- 스케줄 확인
-- SELECT * FROM cron.job;

-- 스케줄 삭제 (필요시)
-- SELECT cron.unschedule('cleanup-old-images');

-- 함수 수동 실행 (테스트용)
-- SELECT cleanup_old_images();

