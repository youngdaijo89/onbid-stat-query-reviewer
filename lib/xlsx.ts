// Design Ref: §2.2 ② — 새 패키지 없이 브라우저에서 .xlsx(zip 묶음)의 첫 시트 칸 값을 읽는다 (PLAN 작업 10)
// 엑셀 파일은 서버로 보내지 않는다. 브라우저 전용 (DOMParser, DecompressionStream 사용).

export type CellValue = string | number;

export interface SheetData {
  sheetNames: string[]; // 통합 문서 안의 모든 시트 이름 (시트 개수 검사용)
  name: string; // 읽은 첫 시트 이름
  cells: Map<string, CellValue>; // "C15" → 값 (빈칸은 들어 있지 않음)
  maxRow: number;
  maxCol: number; // 1 = A열
}

export class XlsxReadError extends Error {}

// 압축을 푼 XML 한 개의 최대 크기 (압축 폭탄 대비)
const MAX_PART_BYTES = 50 * 1024 * 1024;

interface ZipEntry {
  method: number;
  compSize: number;
  size: number;
  localOffset: number;
}

// zip 파일 끝의 목록(중앙 디렉터리)을 읽어 파일 이름 → 위치를 만든다
function readZipDirectory(buf: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new XlsxReadError("엑셀 파일을 열 수 없어요. 손상되었거나 .xlsx 형식이 아니에요.");

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new XlsxReadError("엑셀 파일 구조를 읽지 못했어요.");
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const name = decoder.decode(new Uint8Array(buf, p + 46, nameLen));
    entries.set(name, {
      method: view.getUint16(p + 10, true),
      compSize: view.getUint32(p + 20, true),
      size: view.getUint32(p + 24, true),
      localOffset: view.getUint32(p + 42, true),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// 압축을 풀면서 실제로 나온 양을 센다. 파일 머리에 적힌 크기는 꾸밀 수 있어서(압축 폭탄),
// 그 값만 믿지 않고 MAX_PART_BYTES를 넘는 순간 멈춘다 (보안 점검 2026-11-03)
async function inflateWithLimit(data: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PART_BYTES) {
      await reader.cancel();
      throw new XlsxReadError("엑셀 내용이 너무 커서 점검할 수 없어요.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

async function readZipText(buf: ArrayBuffer, entries: Map<string, ZipEntry>, name: string): Promise<string | null> {
  const e = entries.get(name);
  if (!e) return null;
  if (e.size > MAX_PART_BYTES) throw new XlsxReadError("엑셀 내용이 너무 커서 점검할 수 없어요.");
  const view = new DataView(buf);
  const start = e.localOffset + 30 + view.getUint16(e.localOffset + 26, true) + view.getUint16(e.localOffset + 28, true);
  const data = new Uint8Array(buf, start, e.compSize);
  let bytes: ArrayBuffer;
  if (e.method === 0) {
    bytes = data.slice().buffer;
  } else if (e.method === 8) {
    bytes = await inflateWithLimit(data);
  } else {
    throw new XlsxReadError("지원하지 않는 엑셀 압축 방식이에요.");
  }
  return new TextDecoder().decode(bytes);
}

const parseXml = (text: string) => new DOMParser().parseFromString(text, "application/xml");

// <t> 글자를 모은다 (일본어 읽기 표시 rPh 안의 글자는 뺀다)
function collectText(el: Element): string {
  return Array.from(el.getElementsByTagName("t"))
    .filter((t) => t.parentElement?.tagName !== "rPh")
    .map((t) => t.textContent ?? "")
    .join("");
}

// "C15" → { row: 15, col: 3 }
export function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = /^([A-Z]{1,3})(\d+)$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(m[2]), col };
}

// 3 → "C"
export function colName(col: number): string {
  let s = "";
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export async function readFirstSheet(buf: ArrayBuffer): Promise<SheetData> {
  const entries = readZipDirectory(buf);

  const workbookXml = await readZipText(buf, entries, "xl/workbook.xml");
  if (!workbookXml) throw new XlsxReadError("엑셀 통합 문서 정보를 찾지 못했어요.");
  const sheets = Array.from(parseXml(workbookXml).getElementsByTagName("sheet"));
  if (sheets.length === 0) throw new XlsxReadError("엑셀에 시트가 없어요.");
  const sheetNames = sheets.map((s) => s.getAttribute("name") ?? "");

  // 첫 시트의 실제 파일 위치 찾기 (workbook.xml.rels)
  const relId = sheets[0].getAttribute("r:id");
  const relsXml = await readZipText(buf, entries, "xl/_rels/workbook.xml.rels");
  let sheetPath = "xl/worksheets/sheet1.xml";
  if (relsXml && relId) {
    const rel = Array.from(parseXml(relsXml).getElementsByTagName("Relationship")).find(
      (r) => r.getAttribute("Id") === relId,
    );
    const target = rel?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  }

  // 공유 글자 목록 (있을 때만)
  const sharedXml = await readZipText(buf, entries, "xl/sharedStrings.xml");
  const shared = sharedXml ? Array.from(parseXml(sharedXml).getElementsByTagName("si")).map(collectText) : [];

  const sheetXml = await readZipText(buf, entries, sheetPath);
  if (!sheetXml) throw new XlsxReadError("첫 시트 내용을 찾지 못했어요.");

  const cells = new Map<string, CellValue>();
  let maxRow = 0;
  let maxCol = 0;
  for (const c of Array.from(parseXml(sheetXml).getElementsByTagName("c"))) {
    const ref = c.getAttribute("r");
    const pos = ref ? parseCellRef(ref) : null;
    if (!ref || !pos) continue;
    const type = c.getAttribute("t");
    // 수식 칸은 엑셀이 저장해 둔 계산 결과(<v>)만 쓴다
    const v = c.getElementsByTagName("v")[0]?.textContent ?? null;
    let value: CellValue | null = null;
    if (type === "s") value = v !== null ? (shared[Number(v)] ?? "") : null;
    else if (type === "inlineStr") value = collectText(c.getElementsByTagName("is")[0] ?? c);
    else if (type === "str" || type === "e") value = v;
    else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
    else if (v !== null && v !== "") value = Number(v);
    if (value === null || value === "") continue;
    cells.set(ref, value);
    maxRow = Math.max(maxRow, pos.row);
    maxCol = Math.max(maxCol, pos.col);
  }

  return { sheetNames, name: sheetNames[0], cells, maxRow, maxCol };
}
