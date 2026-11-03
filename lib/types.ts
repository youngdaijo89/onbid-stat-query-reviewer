// Design Ref: §3 — 화면·서버·엑셀 점검이 함께 쓰는 데이터 모양 (PLAN 작업 2)

// 가이드 생성 요청
export interface GuideRequest {
  requirement: string; // 요구사항문 원문
  tableDef: string; // 테이블 정의서
}

export type TableStatus = "확인됨" | "확인 필요";
export type CautionLevel = "높음" | "중간" | "낮음";

// 가이드 결과 (KOBI 답을 이 모양으로 받음)
export interface GuideResult {
  summary: string; // 요구사항문 요약 (3줄 이내, 보고서 맨 위에 사용)
  conditions: {
    // ① 조건 분해표
    item: string; // 예: "기간"
    value: string; // 예: "2025-01-01 ~ 2025-12-31"
    source: string; // 근거가 된 요구사항문 원문 문장
  }[];
  tables: {
    // ② 테이블 안내
    table: string;
    columns: string[];
    joinNote: string; // JOIN 방향 설명
    status: TableStatus;
  }[];
  cautions: {
    // ③ 주의사항
    text: string;
    level: CautionLevel;
  }[];
  skeleton: string; // ④ 쿼리 뼈대 (Oracle)
  exampleQuery: string; // ⑤ 완성 쿼리 예시 (Oracle, 조건별 근거 주석 포함)
  needsCheck: string[]; // "확인 필요" 항목 모음
}

// 가이드를 만든 AI (Design Ref: §2.4): mock = 예시 응답, openai = 테스트용 OpenAI, kobi = 공사 KOBI
export type GuideMode = "mock" | "openai" | "kobi";

export interface GuideResponse {
  data: GuideResult;
  mode: GuideMode;
}

// 오류 응답 (Design Ref: §6.2)
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "KOBI_ERROR"
  | "KOBI_TIMEOUT"
  | "AI_NOT_READY"
  | "AI_CONFIG"
  | "OFF_TASK";

export interface ApiError {
  error: { code: ApiErrorCode; message: string };
}

// 엑셀 특이점 (PLAN 작업 10~12, 11-1에서 사용)
export interface ExcelIssue {
  type:
    | "합계 불일치"
    | "소계 불일치"
    | "가로 합계 불일치"
    | "빈칸"
    | "숫자 아님"
    | "중복 행"
    | "기간 불일치"
    | "단위 불일치";
  cell: string; // 예: "C15"
  row: number; // 예: 15
  column: string; // 예: "C"
  expected?: number; // 코드로 다시 계산한 값
  actual?: number; // 엑셀에 적힌 값
  message: string;
}

// 엑셀 기간·단위 대조 때 서버로 보내는 글자 칸 (엑셀 파일 자체는 보내지 않음)
export interface ExcelLabel {
  cell: string; // 예: "A1"
  kind: "제목" | "단위" | "머리글";
  text: string;
}

// /api/excel 응답 (기간·단위 대조 결과)
export interface ExcelLabelResponse {
  data: { issues: ExcelIssue[] };
  mode: GuideMode;
}

export interface ExcelCheckResult {
  fileName: string;
  sheetName: string;
  rowCount: number;
  issues: ExcelIssue[];
}
