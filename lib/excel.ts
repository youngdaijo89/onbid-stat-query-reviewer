// Design Ref: §2.2 ② "합계·소계 점검 규칙", "제목·단위·머리글 찾기 규칙" (PLAN 작업 10~12)
// 합계는 AI가 아니라 코드로 다시 계산한다 (PRD must ② 규칙 1). 브라우저·서버 어디서나 쓸 수 있는 순수 함수만 둔다.
import { colName, type SheetData } from "@/lib/xlsx";
import type { ExcelIssue, ExcelLabel } from "@/lib/types";

// PRD must ② 규칙 4 (초기값)
export const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
export const MAX_EXCEL_ROWS = 10_000;

const TOTAL_WORDS = ["합계", "총계", "계"];
const SUBTOTAL_WORD = "소계";
// 머리글에 이 글자가 있으면 더하지 않는 열
const NO_SUM_HEADER = /비율|%|순위|번호/;

// 파일을 읽기 전에 검사 (이름·크기)
export function checkExcelFile(name: string, size: number): string | null {
  if (!name.toLowerCase().endsWith(".xlsx")) return "시트가 1개인 .xlsx 파일만 점검할 수 있어요.";
  if (size > MAX_EXCEL_BYTES) return "엑셀 파일은 10MB 이하만 점검할 수 있어요.";
  return null;
}

// 읽은 뒤 검사 (시트 수·행 수)
export function checkSheetShape(sheet: SheetData): string | null {
  if (sheet.sheetNames.length !== 1) return "시트가 1개인 .xlsx 파일만 점검할 수 있어요. 시트를 1개만 남기고 다시 올려 주세요.";
  if (sheet.maxRow > MAX_EXCEL_ROWS) return "엑셀은 1만 행 이하만 점검할 수 있어요.";
  if (sheet.cells.size === 0) return "엑셀 첫 시트가 비어 있어요.";
  return null;
}

const cellAt = (sheet: SheetData, row: number, col: number) => sheet.cells.get(`${colName(col)}${row}`);

// "1,234" 같은 글자 숫자도 숫자로 바꾼다. 숫자가 아니면 null
function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.replace(/,/g, "").trim();
  return t !== "" && !Number.isNaN(Number(t)) ? Number(t) : null;
}

const isText = (v: unknown): v is string => typeof v === "string" && toNumber(v) === null;

// 머리글 = 위에서부터 처음으로 글자 칸이 2개 이상인 행
export function findHeaderRow(sheet: SheetData): number | null {
  for (let r = 1; r <= sheet.maxRow; r++) {
    let textCount = 0;
    for (let c = 1; c <= sheet.maxCol; c++) if (isText(cellAt(sheet, r, c))) textCount++;
    if (textCount >= 2) return r;
  }
  return null;
}

// 서버(AI)로 보낼 글자 칸만 고른다 — 엑셀 파일 자체는 보내지 않는다
export function extractLabels(sheet: SheetData): ExcelLabel[] {
  const headerRow = findHeaderRow(sheet) ?? 0;
  const labels: ExcelLabel[] = [];
  let titleFound = false;
  for (let r = 1; r <= (headerRow || sheet.maxRow); r++) {
    for (let c = 1; c <= sheet.maxCol; c++) {
      const v = cellAt(sheet, r, c);
      if (!isText(v)) continue;
      const cell = `${colName(c)}${r}`;
      if (r === headerRow) labels.push({ cell, kind: "머리글", text: v });
      else if (!titleFound) {
        labels.push({ cell, kind: "제목", text: v });
        titleFound = true;
      } else if (v.includes("단위")) labels.push({ cell, kind: "단위", text: v });
    }
    if (!headerRow && titleFound) break;
  }
  return labels;
}

function rowKind(sheet: SheetData, row: number): "total" | "subtotal" | "detail" {
  for (let c = 1; c <= sheet.maxCol; c++) {
    const v = cellAt(sheet, row, c);
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (t === SUBTOTAL_WORD) return "subtotal";
    if (TOTAL_WORDS.includes(t)) return "total";
  }
  return "detail";
}

export interface TotalsCheck {
  issues: ExcelIssue[];
  checkedCells: number; // 다시 계산해 비교한 합계·소계 칸 수
  message: string | null; // 합계 행을 못 찾은 경우 등 안내
}

// 세로(행 방향) 합계·소계를 다시 계산해 차이가 1 이상인 칸을 찾는다
export function checkTotals(sheet: SheetData): TotalsCheck {
  const headerRow = findHeaderRow(sheet);
  if (headerRow === null) return { issues: [], checkedCells: 0, message: "머리글 행(글자 칸이 2개 이상인 행)을 찾지 못했어요." };

  const kinds = new Map<number, ReturnType<typeof rowKind>>();
  for (let r = headerRow + 1; r <= sheet.maxRow; r++) kinds.set(r, rowKind(sheet, r));
  if (![...kinds.values()].some((k) => k !== "detail")) {
    return { issues: [], checkedCells: 0, message: "'합계·총계·소계·계'라고만 적힌 행을 찾지 못했어요." };
  }

  // 더하는 열: 세부 행에 숫자가 있고, 머리글에 비율·%·순위·번호가 없는 열
  const sumCols: number[] = [];
  for (let c = 1; c <= sheet.maxCol; c++) {
    const header = cellAt(sheet, headerRow, c);
    if (typeof header === "string" && NO_SUM_HEADER.test(header)) continue;
    const hasNumber = [...kinds].some(([r, k]) => k === "detail" && toNumber(cellAt(sheet, r, c)) !== null);
    if (hasNumber) sumCols.push(c);
  }

  const issues: ExcelIssue[] = [];
  let checkedCells = 0;
  for (const c of sumCols) {
    let segment = 0; // 바로 앞 소계(또는 머리글) 이후 세부 행의 합
    let all = 0; // 머리글 아래 세부 행 전체의 합 (소계 제외)
    for (let r = headerRow + 1; r <= sheet.maxRow; r++) {
      const kind = kinds.get(r);
      const value = toNumber(cellAt(sheet, r, c));
      if (kind === "detail") {
        if (value !== null) {
          segment += value;
          all += value;
        }
        continue;
      }
      const expected = kind === "subtotal" ? segment : all;
      if (kind === "subtotal") segment = 0;
      if (value === null) continue; // 합계 행이라도 이 열이 비어 있으면 건너뜀
      checkedCells++;
      // 소수점 계산 오차를 없애려고 소수 넷째 자리까지만 비교
      const diff = Math.abs(Math.round((value - expected) * 10_000) / 10_000);
      if (diff >= 1) {
        const column = colName(c);
        issues.push({
          type: kind === "subtotal" ? "소계 불일치" : "합계 불일치",
          cell: `${column}${r}`,
          row: r,
          column,
          expected,
          actual: value,
          message: `다시 계산한 값은 ${expected.toLocaleString()}인데 엑셀에는 ${value.toLocaleString()}로 적혀 있어요 (차이 ${diff.toLocaleString()}).`,
        });
      }
    }
  }
  return { issues, checkedCells, message: null };
}
