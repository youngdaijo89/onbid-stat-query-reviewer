// Design Ref: §8.1 — 일부러 틀리게 만든 시험용 엑셀 5개를 만든다 (SC-3 측정용).
// 새 패키지 없이 Node 기본 기능만으로 .xlsx(zip 묶음)를 만든다.
// 실행: node samples/make-excel.mjs
import { writeFileSync, mkdirSync } from "node:fs";
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

function sheetXml(rows) {
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => {
          if (v === null || v === undefined) return "";
          const ref = `${colName(c)}${r + 1}`;
          if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function xlsxParts(rows) {
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": sheetXml(rows),
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
for (const sample of [excel01(), excel02(), excel03(), excel04(), excel05()]) {
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
