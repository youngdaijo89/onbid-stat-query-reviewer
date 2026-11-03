// Design Ref: §2.2 "테이블 정의서 입력 형식" — 정의서 엑셀(템플릿)을 "■ 테이블 / - 컬럼" 글로 바꾼다.
// 바꾼 글은 입력칸에 채워 사용자가 확인·수정하고, 그 뒤 검사·이름 대조는 기존 흐름을 그대로 쓴다.
import { colName, type SheetData } from "@/lib/xlsx";

// 머리글 이름으로 열을 찾는다 (템플릿 이름 + 흔히 쓰는 다른 이름)
const HEADER_ALIASES = {
  table: ["테이블명", "테이블", "테이블 이름", "table_name", "table"],
  tableDesc: ["테이블 설명", "테이블설명", "테이블 한글명", "table_comment"],
  column: ["컬럼명", "컬럼", "컬럼 이름", "column_name", "column"],
  type: ["데이터 타입", "데이터타입", "타입", "data_type", "type"],
  columnDesc: ["컬럼 설명", "컬럼설명", "설명", "컬럼 한글명", "column_comment", "comment"],
} as const;
type Field = keyof typeof HEADER_ALIASES;

const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export interface DefinitionResult {
  text: string; // 입력칸에 채울 글
  tables: number;
  columns: number;
}

export class DefinitionReadError extends Error {}

export function definitionFromSheet(sheet: SheetData): DefinitionResult {
  const cell = (r: number, c: number) => {
    const v = sheet.cells.get(`${colName(c)}${r}`);
    return v === undefined ? "" : String(v).trim();
  };

  // 위에서 10행 안에서 "테이블명"과 "컬럼명" 머리글이 함께 있는 행을 찾는다
  let headerRow = 0;
  const cols: Partial<Record<Field, number>> = {};
  for (let r = 1; r <= Math.min(10, sheet.maxRow) && !headerRow; r++) {
    const found: Partial<Record<Field, number>> = {};
    for (let c = 1; c <= sheet.maxCol; c++) {
      const h = normalize(cell(r, c));
      for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
        if (found[field] === undefined && (HEADER_ALIASES[field] as readonly string[]).includes(h)) found[field] = c;
      }
    }
    if (found.table && found.column) {
      headerRow = r;
      Object.assign(cols, found);
    }
  }
  if (!headerRow) {
    throw new DefinitionReadError("머리글(테이블명, 컬럼명)을 찾지 못했어요. [템플릿 내려받기]로 받은 양식에 작성해 주세요.");
  }

  // 테이블명이 비어 있으면 위 행과 같은 테이블로 본다. 나온 순서를 그대로 지킨다.
  const tables = new Map<string, { desc: string; lines: string[] }>();
  let current = "";
  let count = 0;
  for (let r = headerRow + 1; r <= sheet.maxRow; r++) {
    const tableName = cols.table ? cell(r, cols.table) : "";
    if (tableName) current = tableName;
    const column = cols.column ? cell(r, cols.column) : "";
    if (!current || !column) continue;
    if (!tables.has(current)) tables.set(current, { desc: "", lines: [] });
    const entry = tables.get(current)!;
    const desc = cols.tableDesc ? cell(r, cols.tableDesc) : "";
    if (desc && !entry.desc) entry.desc = desc;
    const type = cols.type ? cell(r, cols.type) : "";
    const columnDesc = cols.columnDesc ? cell(r, cols.columnDesc) : "";
    entry.lines.push(`- ${[column, type, columnDesc].filter(Boolean).join("  ")}`);
    count++;
  }
  if (count === 0) throw new DefinitionReadError("정의서에서 컬럼을 하나도 읽지 못했어요. 컬럼명 칸이 비어 있지 않은지 확인해 주세요.");

  const text = [...tables]
    .map(([name, t]) => [`■ ${name}${t.desc ? ` (${t.desc})` : ""}`, ...t.lines].join("\n"))
    .join("\n\n");
  return { text, tables: tables.size, columns: count };
}
