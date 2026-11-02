-- 정답 쿼리 05: 기관별 진행 중 공고 상위 10개 (req-05.txt)
SELECT RANK() OVER (ORDER BY COUNT(*) DESC)      AS 순위,
       o.ORG_NM                                   AS 기관명,
       COUNT(*)                                   AS 진행_중_공고_건수
  FROM VT_NOTICE n
  JOIN VT_ITEM i ON i.ITEM_ID = n.ITEM_ID
  JOIN VT_ORG  o ON o.ORG_CD  = i.REG_ORG_CD
 WHERE n.BID_START_DT <= DATE '2025-12-31'                               -- 기준일에 입찰 기간 안
   AND n.BID_END_DT   >= DATE '2025-12-31'
   AND (n.CANCEL_DT IS NULL OR n.CANCEL_DT > DATE '2025-12-31')          -- 기준일까지 취소되지 않음
 GROUP BY o.ORG_CD, o.ORG_NM
 ORDER BY 진행_중_공고_건수 DESC
 FETCH FIRST 10 ROWS ONLY;                                               -- Oracle 12c 이상
-- 함정: NOTICE_STAT_CD = '10'은 "지금" 상태라서 2025-12-31 기준 집계에 쓰면 안 된다.
-- 주의: 10위 동점이 있으면 FETCH FIRST 10 ROWS WITH TIES 사용 여부를 요청처에 확인한다.
