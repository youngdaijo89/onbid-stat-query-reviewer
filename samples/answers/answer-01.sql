-- 정답 쿼리 01: 2025년 월별 낙찰 현황 (req-01.txt)
-- 가상 테이블 기준. SC-2(완성 쿼리 예시 정확도) 측정용.
SELECT TO_CHAR(r.OPEN_DT, 'YYYY-MM')              AS 월,
       COUNT(*)                                   AS 낙찰_건수,
       ROUND(SUM(r.WIN_AMT) / 100000000, 1)       AS 낙찰_금액_억원      -- 억원 단위, 소수점 첫째 자리
  FROM VT_BID_RESULT r
  JOIN VT_NOTICE n
    ON n.NOTICE_ID = r.NOTICE_ID
 WHERE r.RESULT_CD = '1'                                                 -- 낙찰만
   AND r.OPEN_DT >= DATE '2025-01-01'                                    -- 개찰일 기준
   AND r.OPEN_DT <  DATE '2026-01-01'                                    -- 12월 31일 하루 전체 포함
   AND n.NOTICE_STAT_CD <> '20'                                          -- 취소 공고 제외
 GROUP BY TO_CHAR(r.OPEN_DT, 'YYYY-MM')
 ORDER BY 월;
-- 주의: 낙찰이 0건인 달은 결과에 나오지 않는다. 12개월을 모두 보여야 하면 월 목록과 외부 조인한다.
