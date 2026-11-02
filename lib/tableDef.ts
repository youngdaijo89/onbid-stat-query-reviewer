// Design Ref: §2.2 "테이블 정의서 입력 형식" — 정의서에서 테이블·컬럼 이름을 뽑아
// AI 답에 정의서에 없는 이름이 있는지 대조한다. 이름은 지우거나 바꾸지 않고 "확인 필요"로 표시만 한다.
import type { GuideResult } from "@/lib/types";

// 테이블명(대문자) → 컬럼명(대문자) 목록
export type TableCatalog = Map<string, Set<string>>;

export function parseTableDef(text: string): TableCatalog {
  const catalog: TableCatalog = new Map();
  let current: Set<string> | null = null;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (line.startsWith("■")) {
      // 공백 앞까지가 테이블명
      const name = line.slice(1).trim().split(/\s+/)[0]?.toUpperCase();
      current = name ? new Set() : null;
      if (name && current) catalog.set(name, current);
    } else if (line.startsWith("-") && current) {
      // 바로 위 테이블에 속한 컬럼. 첫 단어가 컬럼명
      const col = line.slice(1).trim().split(/\s+/)[0]?.toUpperCase();
      if (col) current.add(col);
    }
  }
  return catalog;
}

// AI 답의 테이블 안내를 정의서와 대조해 status와 needsCheck를 채운다 (원본은 바꾸지 않고 새로 만든다)
export function checkNamesAgainstDef(result: GuideResult, tableDef: string): GuideResult {
  const catalog = parseTableDef(tableDef);
  const needsCheck = [...result.needsCheck];

  if (catalog.size === 0) {
    needsCheck.push("정의서 형식을 읽지 못해 이름 대조를 하지 못했습니다.");
    return { ...result, needsCheck };
  }

  const tables = result.tables.map((t) => {
    const columns = catalog.get(t.table.toUpperCase());
    if (!columns) {
      needsCheck.push(`${t.table} — 정의서에 없는 테이블`);
      return { ...t, status: "확인 필요" as const };
    }
    const missing = t.columns.filter((c) => !columns.has(c.toUpperCase()));
    for (const c of missing) needsCheck.push(`${t.table}.${c} — 정의서에 없는 컬럼`);
    return missing.length > 0 ? { ...t, status: "확인 필요" as const } : t;
  });

  return { ...result, tables, needsCheck };
}
