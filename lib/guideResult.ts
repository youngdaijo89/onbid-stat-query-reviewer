// Design Ref: §2.2 ① — AI 답이 정해진 모양(GuideResult)인지 검사하고, 화면에 보이기 전에 코드가 지킬 규칙을 적용한다
import type { GuideResult } from "@/lib/types";

const isString = (v: unknown): v is string => typeof v === "string";
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isGuideResult(v: unknown): v is GuideResult {
  if (!isObject(v)) return false;
  return (
    isString(v.summary) &&
    isString(v.skeleton) &&
    isString(v.exampleQuery) &&
    isStringArray(v.needsCheck) &&
    Array.isArray(v.conditions) &&
    v.conditions.every((c) => isObject(c) && isString(c.item) && isString(c.value) && isString(c.source)) &&
    Array.isArray(v.tables) &&
    v.tables.every(
      (t) =>
        isObject(t) &&
        isString(t.table) &&
        isStringArray(t.columns) &&
        isString(t.joinNote) &&
        (t.status === "확인됨" || t.status === "확인 필요"),
    ) &&
    Array.isArray(v.cautions) &&
    v.cautions.every(
      (c) => isObject(c) && isString(c.text) && (c.level === "높음" || c.level === "중간" || c.level === "낮음"),
    )
  );
}

// 실제 AI 답은 지나치게 길 수 있어 칸마다 상한을 둔다 (CHECK 보안 #3 — 답 모양 엄격 검사)
const LIMITS = { text: 2_000, query: 8_000, list: 60 };
export function withinLimits(r: GuideResult): boolean {
  const short = (s: string) => s.length <= LIMITS.text;
  return (
    short(r.summary) &&
    r.skeleton.length <= LIMITS.query &&
    r.exampleQuery.length <= LIMITS.query &&
    [r.conditions, r.tables, r.cautions, r.needsCheck].every((a) => a.length <= LIMITS.list) &&
    r.conditions.every((c) => short(c.item) && short(c.value) && short(c.source)) &&
    r.tables.every((t) => short(t.table) && short(t.joinNote) && t.columns.length <= LIMITS.list) &&
    r.cautions.every((c) => short(c.text)) &&
    r.needsCheck.every(short)
  );
}

// AI가 만든 SQL은 읽기 전용 SELECT 한 문장만 허용한다 (CHECK 보안 #2 — 복사해 실행했을 때 데이터가 바뀌거나 밖으로 나가지 않게)
const FORBIDDEN =
  /\b(INSERT|UPDATE|DELETE|MERGE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC(UTE)?|BEGIN|DECLARE|CALL|UTL_HTTP|UTL_TCP|UTL_SMTP|UTL_FILE|DBMS_\w+|HTTPURITYPE)\b/i;
const HIDDEN_CHARS = /[​-‏‪-‮⁦-⁩﻿]/; // 눈에 안 보이는 글자·방향 바꾸는 글자

// 주석과 따옴표 안 글자는 빼고 본다 (근거 주석 속 단어 때문에 잘못 걸리지 않게)
const codeOnly = (sql: string) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .trim();

// 문제가 없으면 null, 있으면 사람이 읽을 이유를 돌려준다
export function unsafeSqlReason(sql: string): string | null {
  if (sql.trim() === "") return null;
  if (HIDDEN_CHARS.test(sql)) return "눈에 보이지 않는 특수 문자가 들어 있음";
  const code = codeOnly(sql);
  if (!/^(SELECT|WITH)\b/i.test(code)) return "SELECT로 시작하지 않음";
  if (/;\s*\S/.test(code)) return "문장이 두 개 이상임";
  const bad = FORBIDDEN.exec(code);
  if (bad) return `허용되지 않는 명령(${bad[1].toUpperCase()})이 들어 있음`;
  return null;
}

// AI가 다른 DB 문법을 섞는 일이 잦아(실측: WITH ROLLUP, MONTH()) 코드가 찾아서 "확인 필요"로 알린다. 쿼리는 숨기지 않는다.
const NOT_ORACLE: [RegExp, string][] = [
  [/\bWITH\s+ROLLUP\b/i, "WITH ROLLUP은 Oracle 문법이 아님 → GROUP BY ROLLUP(...)으로 고치세요"],
  [/\bLIMIT\s+\d/i, "LIMIT은 Oracle 문법이 아님 → FETCH FIRST n ROWS ONLY로 고치세요"],
  [/\bSELECT\s+TOP\b/i, "SELECT TOP은 Oracle 문법이 아님 → FETCH FIRST n ROWS ONLY로 고치세요"],
  [/\b(YEAR|MONTH|DAY|QUARTER)\s*\(/i, "YEAR()·MONTH() 같은 함수는 Oracle에 없음 → EXTRACT(...) 또는 TO_CHAR(날짜, 'Q')로 고치세요"],
  [/\b(IFNULL|ISNULL|DATE_FORMAT|DATEADD|DATEDIFF|GETDATE|NOW)\s*\(/i, "Oracle에 없는 함수가 있음 → NVL·TO_CHAR·SYSDATE 등으로 고치세요"],
];

// 같은 절이 SELECT 수보다 많으면 줄을 고치다 옛 줄을 남긴 것 (실측: 자동 수정 때 GROUP BY 두 줄)
const count = (code: string, re: RegExp) => (code.match(re) ?? []).length;

export function notOracleHints(label: string, sql: string): string[] {
  const code = codeOnly(sql);
  const hints = NOT_ORACLE.filter(([re]) => re.test(code)).map(([, msg]) => `${label}: ${msg}`);
  const selects = count(code, /\bSELECT\b/gi);
  for (const clause of ["GROUP BY", "ORDER BY"]) {
    if (count(code, new RegExp(`\\b${clause.replace(" ", "\\s+")}\\b`, "gi")) > selects) {
      hints.push(`${label}: ${clause}가 두 번 들어 있음 → 한 줄로 합치세요`);
    }
  }
  return hints;
}

// 자동 수정(PLAN 작업 8-2)에 넘길 "고칠 점" 목록 — 안전 검사에 걸리면 그 이유, 아니면 Oracle 문법 힌트
export function sqlProblems(label: string, sql: string): string[] {
  const reason = unsafeSqlReason(sql);
  return reason ? [`${label}: ${reason}`] : notOracleHints(label, sql);
}

// AI가 고쳐 보낸 답이 {skeleton, exampleQuery} 모양이고 길이 상한 안인지
export function isSqlFix(v: unknown): v is { skeleton: string; exampleQuery: string } {
  return (
    isObject(v) &&
    isString(v.skeleton) &&
    isString(v.exampleQuery) &&
    v.exampleQuery.trim() !== "" &&
    v.skeleton.length <= LIMITS.query &&
    v.exampleQuery.length <= LIMITS.query
  );
}

// PRD must ① 규칙 5 — 완성 쿼리 예시 첫 줄의 검증 필요 표시는 AI 답에 기대지 않고 코드가 항상 붙인다
export const VERIFY_NOTICE = "예시 — 실행 전 작성자 검증 필요";

export function withVerifyHeader(query: string): string {
  const lines = query.split(/\r\n|\r|\n/);
  const body = lines[0]?.includes(VERIFY_NOTICE) ? lines.slice(1) : lines;
  return [`-- ${VERIFY_NOTICE}`, ...body].join("\n");
}
