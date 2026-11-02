-- 정답 쿼리 02: 2025년 상반기 물건 유형별 유찰 현황 (req-02.txt)
SELECT CASE i.ITEM_TYPE_CD
         WHEN '01' THEN '부동산'
         WHEN '02' THEN '자동차'
         ELSE '기타'
       END                                        AS 물건_유형,
       COUNT(DISTINCT i.ITEM_ID)                  AS 유찰_물건_수       -- 같은 물건 여러 번 유찰 → 1건
  FROM VT_BID_RESULT r
  JOIN VT_NOTICE n ON n.NOTICE_ID = r.NOTICE_ID
  JOIN VT_ITEM   i ON i.ITEM_ID   = n.ITEM_ID
 WHERE r.RESULT_CD = '2'                                                 -- 유찰만
   AND r.OPEN_DT >= DATE '2025-01-01'                                    -- 개찰일 기준
   AND r.OPEN_DT <  DATE '2025-07-01'                                    -- 상반기 = 6월 30일까지
 GROUP BY i.ITEM_TYPE_CD
 ORDER BY i.ITEM_TYPE_CD;
-- 주의: 유형별 합계는 유형별 숫자를 더하면 된다. 한 물건은 유형이 하나뿐이라 중복되지 않는다.
