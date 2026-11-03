"use client";
// Design Ref: §5.3 GuideForm — 입력칸 2개, 글자·줄 수, 정의서 엑셀 불러오기, 생성 버튼 (PLAN 작업 3·4·7-1)
import TableDefUpload from "@/components/TableDefUpload";
import { countLines, MAX_REQUIREMENT_CHARS, MAX_TABLEDEF_LINES, validateGuideInput } from "@/lib/validate";

// 정의서 입력 형식 예시 (Design Ref: §2.2 "테이블 정의서 입력 형식")
const TABLEDEF_PLACEHOLDER = `■ 테이블명 (설명)
- 컬럼명   타입   설명 (코드값: 뜻, 코드값: 뜻)
- 컬럼명   타입   설명`;

interface Props {
  requirement: string;
  tableDef: string;
  loading: boolean;
  onRequirementChange: (value: string) => void;
  onTableDefChange: (value: string) => void;
  onFillExample: () => void;
  onSubmit: () => void;
}

export default function GuideForm({
  requirement,
  tableDef,
  loading,
  onRequirementChange,
  onTableDefChange,
  onFillExample,
  onSubmit,
}: Props) {
  const reqChars = requirement.length;
  const defLines = countLines(tableDef);
  const check = validateGuideInput({ requirement, tableDef });
  // 아무것도 안 쓴 처음에는 안내만 흐리게, 제한을 넘으면 빨갛게 보여준다
  const isEmpty = requirement.trim() === "" && tableDef.trim() === "";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (check.ok && !loading) onSubmit();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">① 입력</h2>
        <button
          type="button"
          onClick={onFillExample}
          disabled={loading}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          예시 입력 채우기
        </button>
      </div>

      {/* 요구사항문 → 테이블 정의서 순서로 위아래 배치 (정의서 쪽 버튼·안내가 좁아지지 않게) */}
      <div className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-black dark:text-zinc-50">
            요구사항문 <span className="text-red-600">(필수)</span>
          </span>
          <textarea
            value={requirement}
            onChange={(e) => onRequirementChange(e.target.value)}
            rows={8}
            placeholder="요청처가 보낸 자료 요구 원문을 그대로 붙여넣으세요."
            className="rounded-md border border-zinc-300 bg-white p-3 text-sm leading-6 text-black placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <span
            className={`self-end text-xs ${reqChars > MAX_REQUIREMENT_CHARS ? "font-semibold text-red-600" : "text-zinc-500"}`}
          >
            {reqChars.toLocaleString()} / {MAX_REQUIREMENT_CHARS.toLocaleString()}자
          </span>
        </label>

        {/* 정의서는 직접 붙여넣거나 엑셀(템플릿)로 불러온다 — 버튼이 있어 label 대신 div로 감싼다 */}
        <div className="flex flex-col gap-2">
          <label htmlFor="tabledef-input" className="text-sm font-medium text-black dark:text-zinc-50">
            테이블 정의서 <span className="text-red-600">(필수)</span>
          </label>
          <TableDefUpload disabled={loading} onLoaded={onTableDefChange} />
          <textarea
            id="tabledef-input"
            value={tableDef}
            onChange={(e) => onTableDefChange(e.target.value)}
            rows={12}
            placeholder={TABLEDEF_PLACEHOLDER}
            className="rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs leading-5 text-black placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <span
            className={`self-end text-xs ${defLines > MAX_TABLEDEF_LINES ? "font-semibold text-red-600" : "text-zinc-500"}`}
          >
            {defLines} / {MAX_TABLEDEF_LINES}줄
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {/* 버튼을 누를 수 없는 이유를 바로 보여준다 */}
        {!check.ok && !isEmpty && <p className="text-sm text-red-600">{check.message}</p>}
        <button
          type="submit"
          disabled={!check.ok || loading}
          className="rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
        >
          {loading ? "가이드 만드는 중…" : "가이드 생성"}
        </button>
      </div>
    </form>
  );
}
