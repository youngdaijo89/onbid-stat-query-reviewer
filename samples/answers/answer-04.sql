-- 정답 쿼리 04: 2025년 분기별 단독 입찰 비율 (req-04.txt)
SELECT TO_CHAR(r.OPEN_DT, 'Q') || '분기'          AS 분기,              -- 개찰일 기준
       COUNT(*)                                   AS 낙찰_건수,
       SUM(CASE WHEN r.BIDDER_CNT = 1 THEN 1 ELSE 0 END) AS 단독_입찰_건수,
       ROUND(100 * SUM(CASE WHEN r.BIDDER_CNT = 1 THEN 1 ELSE 0 END)
                 / NULLIF(COUNT(*), 0), 1)        AS 단독_입찰_비율      -- 0으로 나누기 방지
  FROM VT_BID_RESULT r
 WHERE r.RESULT_CD = '1'                                                 -- 낙찰만
   AND r.OPEN_DT >= DATE '2025-01-01'
   AND r.OPEN_DT <  DATE '2026-01-01'
 GROUP BY TO_CHAR(r.OPEN_DT, 'Q')
 ORDER BY 분기;
-- 주의: 연간 합계 행의 비율은 분기 비율을 더하거나 평균 내지 않고, 연간 단독 건수 ÷ 연간 낙찰 건수로 다시 계산한다.
