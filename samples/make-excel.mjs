// Design Ref: §8.1 — 일부러 틀리게 만든 시험용 엑셀 5개를 만든다 (SC-3 측정용).
// 새 패키지 없이 Node 기본 기능만으로 .xlsx(zip 묶음)를 만든다.
// 실행: node samples/make-excel.mjs
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { crc32 } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLES_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(SAMPLES_DIR, "excel");
// 화면의 [예시 엑셀로 점검]·내려받기 링크가 쓰는 복사본 (public 폴더는 그대로 웹에 공개됨, 가상 데이터만)
const PUBLIC_DIR = join(SAMPLES_DIR, "..", "public", "samples");

// ---------- 시험 자료 정의 ----------
// rows: 1행부터 차례대로. 숫자는 숫자 칸, 글자는 글자 칸이 된다. null은 빈칸.
// errors: 일부러 틀리게 넣은 곳 (정답표 출력용)

const sum = (list) => list.reduce((a, b) => a + b, 0);

function excel01() {
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
  const counts = [42, 38, 51, 47, 55, 49, 60, 58, 53, 61, 57, 64];
  const amounts = [1230, 1105, 1580, 1342, 1675, 1410, 1820, 1765, 1590, 1888, 1702, 1934];
  const wrongCount = sum(counts) + 10;
  return {
    file: "excel-01.xlsx",
    requirement: "req-01.txt",
    rows: [
      ["2025년 월별 낙찰 현황 (개찰일 기준, 취소 공고 제외)"],
      ["(단위: 건, 백만원)"],
      ["월", "낙찰 건수", "낙찰 금액(백만원)"],
      ...months.map((m, i) => [m, counts[i], amounts[i]]),
      ["합계", wrongCount, sum(amounts)],
    ],
    errors: [
      { type: "합계 불일치", cell: "B16", expected: sum(counts), actual: wrongCount },
      { type: "단위 불일치", cell: "C3", note: "요구사항은 억원 단위인데 머리글은 백만원" },
    ],
  };
}

function excel02() {
  const types = ["부동산", "자동차", "기타"];
  const counts = [37, 22, 15];
  const wrongTotal = sum(counts) + 3;
  return {
    file: "excel-02.xlsx",
    requirement: "req-02.txt",
    rows: [
      ["2025년 1~12월 물건 유형별 유찰 현황"],
      ["(단위: 건)"],
      ["물건 유형", "유찰 물건 수"],
      ...types.map((t, i) => [t, counts[i]]),
      ["합계", wrongTotal],
    ],
    errors: [
      { type: "합계 불일치", cell: "B7", expected: sum(counts), actual: wrongTotal },
      { type: "기간 불일치", cell: "A1", note: "요구사항은 2025년 상반기인데 제목은 1~12월" },
    ],
  };
}

function excel03() {
  const data = {
    2023: { 공공: [120, 8], 민간: [85, 5] },
    2024: { 공공: [132, 9], 민간: [91, 6] },
    2025: { 공공: [140, 7], 민간: [98, 4] },
  };
  const rows = [
    ["2023~2025년 기관 유형별 공고 현황"],
    ["(단위: 건)"],
    ["연도", "기관 유형", "공고 건수", "취소 공고 건수"],
  ];
  let total = [0, 0];
  let wrongSubtotal = null;
  for (const [year, byType] of Object.entries(data)) {
    const sub = [0, 0];
    for (const [type, [cnt, cancel]] of Object.entries(byType)) {
      rows.push([`${year}년`, type, cnt, cancel]);
      sub[0] += cnt;
      sub[1] += cancel;
    }
    total = [total[0] + sub[0], total[1] + sub[1]];
    if (year === "2024") {
      // 2024년 소계 공고 건수를 5 적게 적는다
      wrongSubtotal = { expected: sub[0], actual: sub[0] - 5, row: rows.length + 1 };
      rows.push([`${year}년`, "소계", sub[0] - 5, sub[1]]);
    } else {
      rows.push([`${year}년`, "소계", sub[0], sub[1]]);
    }
  }
  rows.push(["합계", null, total[0], total[1]]);
  return {
    file: "excel-03.xlsx",
    requirement: "req-03.txt",
    rows,
    errors: [
      {
        type: "소계 불일치",
        cell: `C${wrongSubtotal.row}`,
        expected: wrongSubtotal.expected,
        actual: wrongSubtotal.actual,
      },
    ],
  };
}

function excel04() {
  const quarters = ["1분기", "2분기", "3분기", "4분기"];
  const wins = [150, 162, 171, 158];
  const singles = [21, 25, 19, 23];
  const rate = (s, w) => Math.round((s / w) * 1000) / 10;
  const wrongSingles = sum(singles) + 7;
  return {
    file: "excel-04.xlsx",
    requirement: "req-04.txt",
    rows: [
      ["2025년 분기별 단독 입찰 비율"],
      ["(단위: 건, %)"],
      ["분기", "낙찰 건수", "단독 입찰 건수", "단독 입찰 비율(%)"],
      ...quarters.map((q, i) => [q, wins[i], singles[i], rate(singles[i], wins[i])]),
      // 합계 행의 비율은 분기 비율의 합이 아니라 연간 값으로 다시 계산한 값 (정상)
      ["합계", sum(wins), wrongSingles, rate(sum(singles), sum(wins))],
    ],
    errors: [
      { type: "합계 불일치", cell: "C8", expected: sum(singles), actual: wrongSingles },
    ],
    notes: ["D열(비율)은 더하면 안 되는 열이다. D8을 '합계 불일치'로 잡으면 잘못 탐지한 것이다."],
  };
}

// 칸 점검(작업 11-1)용: 가로 합계 열, 빈칸, 중복 행, 숫자 칸의 글자. 세로 합계는 "숫자만 더한 값"으로 맞춰 두어
// 새 규칙의 오류만 드러나게 했다. (E9는 E5 오류 때문에 함께 어긋나는 결과 — 정답표에 적음)
function excel06() {
  return {
    file: "excel-06.xlsx",
    requirement: "(짝 없음)",
    rows: [
      ["2025년 분기별 물건 유형별 낙찰 건수"],
      ["(단위: 건)"],
      ["분기", "부동산", "자동차", "기타", "합계"],
      ["1분기", 30, 12, 5, 47],
      ["2분기", 28, 10, 6, 46], // 합계 46 ← 실제 44
      ["3분기", 35, null, 7, 42], // 자동차 빈칸
      ["1분기", 30, 12, 5, 47], // 4행과 똑같은 행
      ["4분기", 33, 11, "1O", 44], // 기타에 글자(영문 O)
      ["합계", 156, 45, 23, 226],
    ],
    errors: [
      { type: "가로 합계 불일치", cell: "E5", expected: 44, actual: 46 },
      { type: "빈칸", cell: "C6", note: "자동차 칸이 비어 있음" },
      { type: "중복 행", cell: "A7", note: "4행과 똑같음" },
      { type: "숫자 아님", cell: "D8", note: '"1O" (숫자 0이 아닌 영문 O)' },
      { type: "가로 합계 불일치", cell: "E9", expected: 224, actual: 226 },
    ],
    notes: ["E9는 E5를 잘못 적은 탓에 함께 어긋난 결과다 (156+45+23=224).", "세로 합계·소계 오류는 없어야 한다."],
  };
}

function excel05() {
  const counts = [48, 41, 37, 33, 30, 28, 25, 22, 20, 18];
  const wrongTotal = sum(counts) + 1;
  return {
    file: "excel-05.xlsx",
    requirement: "req-05.txt",
    rows: [
      ["2025년 11월 말 기준 기관별 진행 중 공고 상위 10개"],
      ["(단위: 건)"],
      ["순위", "기관명", "진행 중 공고 건수"],
      ...counts.map((c, i) => [i + 1, `가상기관 ${String(i + 1).padStart(2, "0")}`, c]),
      ["합계", null, wrongTotal],
    ],
    errors: [
      { type: "합계 불일치", cell: "C14", expected: sum(counts), actual: wrongTotal },
      { type: "기간 불일치", cell: "A1", note: "요구사항은 2025년 12월 31일 기준인데 제목은 11월 말" },
    ],
    notes: ["차이가 정확히 1이다 (PRD 기준 '차이 1 이상'의 경계값 시험).", "A열(순위)은 더하면 안 되는 열이다."],
  };
}

// ---------- .xlsx 만들기 ----------

const escapeXml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const colName = (i) => String.fromCharCode(65 + i); // 0 → A (이 자료는 D열까지만 씀)

// opts.boldHeader: 1행을 굵게 / opts.widths: 열 너비 목록 (정의서 템플릿용, 시험 엑셀에는 쓰지 않음)
function sheetXml(rows, opts = {}) {
  const body = rows
    .map((row, r) => {
      const style = opts.boldHeader && r === 0 ? ' s="1"' : "";
      const cells = row
        .map((v, c) => {
          if (v === null || v === undefined) return "";
          const ref = `${colName(c)}${r + 1}`;
          if (typeof v === "number") return `<c r="${ref}"${style}><v>${v}</v></c>`;
          return `<c r="${ref}"${style} t="inlineStr"><is><t>${escapeXml(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const cols = opts.widths
    ? `<cols>${opts.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${body}</sheetData></worksheet>`;
}

const BASIC_STYLES = `<fonts count="1"><font><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>`;
// 굵은 글씨 + 연한 배경 머리글 스타일(s="1")을 더한 버전
const HEADER_STYLES = `<fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>`;

function xlsxParts(rows, opts = {}) {
  const sheetName = escapeXml(opts.sheetName ?? "Sheet1");
  const styles = opts.boldHeader ? HEADER_STYLES : BASIC_STYLES;
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${styles}</styleSheet>`,
    "xl/worksheets/sheet1.xml": sheetXml(rows, opts),
  };
}

// 압축하지 않는(store) 방식의 zip 파일을 만든다
function zip(files) {
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (11 << 5) | 2; // 2026-11-02
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, "utf8");
    const data = Buffer.from(text, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // 파일 이름 UTF-8
    local.writeUInt16LE(0, 8); // 압축 없음
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  const count = Object.keys(files).length;
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

// ---------- 실행 ----------

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PUBLIC_DIR, { recursive: true });
for (const sample of [excel01(), excel02(), excel03(), excel04(), excel05(), excel06()]) {
  const xlsx = zip(xlsxParts(sample.rows));
  writeFileSync(join(OUT_DIR, sample.file), xlsx);
  writeFileSync(join(PUBLIC_DIR, sample.file), xlsx);
  console.log(`\n${sample.file} (${sample.requirement})`);
  for (const e of sample.errors) {
    const detail = e.note ?? `기대값 ${e.expected}, 실제값 ${e.actual}`;
    console.log(`  - ${e.type} @ ${e.cell}: ${detail}`);
  }
  for (const n of sample.notes ?? []) console.log(`  * ${n}`);
}

// ---------- 테이블 정의서 엑셀 (템플릿 + 예시) ----------
// 화면의 [템플릿 내려받기]·[예시 엑셀로 채우기]가 쓴다. 예시는 table-definition.txt에서 만들어 내용이 하나로 유지된다.

const DEF_HEADER = ["테이블명", "테이블 설명", "컬럼명", "데이터 타입", "컬럼 설명"];
const DEF_OPTS = { boldHeader: true, widths: [20, 22, 20, 16, 50], sheetName: "테이블정의서" };

// "■ 테이블 (설명)" / "- 컬럼 타입 설명" 형식의 글을 엑셀 행으로 바꾼다 (컬럼이 없는 ■ 줄은 건너뜀)
function definitionRows(text) {
  const rows = [];
  let table = null;
  let firstOfTable = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("■")) {
      const m = /^■\s*(\S+)\s*(?:\((.*)\))?/.exec(line);
      table = m ? { name: m[1], desc: m[2] ?? "" } : null;
      firstOfTable = true;
    } else if (line.startsWith("-") && table) {
      const [name, type = "", ...rest] = line.slice(1).trim().split(/\s+/);
      // 같은 테이블의 두 번째 줄부터는 테이블명을 비워 둔다 (비어 있으면 위 행과 같은 테이블로 읽음)
      rows.push(firstOfTable ? [table.name, table.desc, name, type, rest.join(" ")] : [null, null, name, type, rest.join(" ")]);
      firstOfTable = false;
    }
  }
  return rows;
}

const TEMPLATE_DIR = join(SAMPLES_DIR, "..", "public", "templates");
mkdirSync(TEMPLATE_DIR, { recursive: true });

const template = [
  DEF_HEADER,
  ["VT_SAMPLE", "예시 테이블 - 이 두 줄은 지우고 작성", "SAMPLE_ID", "VARCHAR2(20)", "예시 ID (PK)"],
  [null, null, "SAMPLE_CD", "CHAR(2)", "예시 코드 (01: 가, 02: 나)"],
];
writeFileSync(join(TEMPLATE_DIR, "table-definition-template.xlsx"), zip(xlsxParts(template, DEF_OPTS)));

const example = [DEF_HEADER, ...definitionRows(readFileSync(join(SAMPLES_DIR, "table-definition.txt"), "utf8"))];
writeFileSync(join(PUBLIC_DIR, "table-definition.xlsx"), zip(xlsxParts(example, DEF_OPTS)));
console.log(`\n테이블 정의서: 템플릿 1개, 예시(컬럼 ${example.length - 1}개) 1개를 만들었어요.`);
