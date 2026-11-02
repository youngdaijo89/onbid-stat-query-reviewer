-- 정답 쿼리 03: 최근 3년간 기관 유형별 공고 현황 (req-03.txt)
SELECT TO_CHAR(n.NOTICE_DT, 'YYYY')               AS 연도,              -- 공고일 기준
       CASE o.ORG_TYPE_CD WHEN 'G' THEN '공공' ELSE '민간' END AS 기관_유형,
       COUNT(*)                                   AS 공고_건수,         -- 취소 공고 포함
       SUM(CASE WHEN n.NOTICE_STAT_CD = '20' THEN 1 ELSE 0 END) AS 취소_공고_건수
  FROM VT_NOTICE n
  JOIN VT_ITEM i ON i.ITEM_ID = n.ITEM_ID
  JOIN VT_ORG  o ON o.ORG_CD  = i.REG_ORG_CD                             -- 물건 → 등록 기관
 WHERE n.NOTICE_DT >= DATE '2023-01-01'
   AND n.NOTICE_DT <  DATE '2026-01-01'
 GROUP BY TO_CHAR(n.NOTICE_DT, 'YYYY'), o.ORG_TYPE_CD
 ORDER BY 연도, o.ORG_TYPE_CD;
-- 연도별 소계·전체 합계가 필요하면 GROUP BY ROLLUP(TO_CHAR(n.NOTICE_DT, 'YYYY'), o.ORG_TYPE_CD)를 쓴다.
