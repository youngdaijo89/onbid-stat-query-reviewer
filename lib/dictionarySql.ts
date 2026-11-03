// Design Ref: §2.2 "테이블 정의서 입력 형식" — Oracle 데이터 사전에서 정의서 템플릿과 같은 모양으로 뽑는 조회 SQL.
// 앱은 이 SQL을 실행하지 않는다 (PRD 6번 "DB 접속·쿼리 실행 안 함"). 사용자가 SQL Developer 등에서 직접 실행하고,
// 결과를 .xlsx로 저장해 [엑셀로 불러오기]로 올린다. 열 이름(별칭)은 lib/tableDefExcel.ts의 머리글 이름과 같다.

export const DICTIONARY_SQL = `-- 테이블 정의서 추출 (Oracle 데이터 사전 조회 — 읽기 전용)
-- 1) 스키마명과 테이블 이름을 이번 통계에 필요한 것으로 바꿉니다.
-- 2) 실행 결과를 엑셀(.xlsx)로 내보내 [엑셀로 불러오기]로 올립니다.
SELECT c.TABLE_NAME                                   AS "테이블명",
       t.COMMENTS                                     AS "테이블 설명",
       c.COLUMN_NAME                                  AS "컬럼명",
       c.DATA_TYPE ||
         CASE
           WHEN c.DATA_TYPE IN ('VARCHAR2', 'NVARCHAR2', 'CHAR', 'NCHAR')
             THEN '(' || c.CHAR_LENGTH || ')'
           WHEN c.DATA_TYPE = 'NUMBER' AND c.DATA_PRECISION IS NOT NULL
             THEN '(' || c.DATA_PRECISION ||
                  CASE WHEN c.DATA_SCALE > 0 THEN ',' || c.DATA_SCALE END || ')'
         END                                          AS "데이터 타입",
       cc.COMMENTS ||
         CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN ' (PK)' END
                                                      AS "컬럼 설명"
  FROM ALL_TAB_COLUMNS c
  LEFT JOIN ALL_TAB_COMMENTS t
         ON t.OWNER = c.OWNER AND t.TABLE_NAME = c.TABLE_NAME
  LEFT JOIN ALL_COL_COMMENTS cc
         ON cc.OWNER = c.OWNER AND cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
  LEFT JOIN (SELECT acc.OWNER, acc.TABLE_NAME, acc.COLUMN_NAME
               FROM ALL_CONSTRAINTS ac
               JOIN ALL_CONS_COLUMNS acc
                 ON acc.OWNER = ac.OWNER AND acc.CONSTRAINT_NAME = ac.CONSTRAINT_NAME
              WHERE ac.CONSTRAINT_TYPE = 'P') pk
         ON pk.OWNER = c.OWNER AND pk.TABLE_NAME = c.TABLE_NAME AND pk.COLUMN_NAME = c.COLUMN_NAME
 WHERE c.OWNER = '스키마명'                            -- 예: 테이블을 가진 계정(스키마) 이름
   AND c.TABLE_NAME IN ('테이블1', '테이블2')          -- 이번 통계에 필요한 테이블만
 ORDER BY c.TABLE_NAME, c.COLUMN_ID;
`;
