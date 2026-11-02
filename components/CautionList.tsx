// Design Ref: §5.3 CautionList — ③ 주의사항 + 중요도 (높음 → 중간 → 낮음 순으로 보여줌)
import type { CautionLevel, GuideResult } from "@/lib/types";

const LEVEL_ORDER: Record<CautionLevel, number> = { 높음: 0, 중간: 1, 낮음: 2 };

const LEVEL_STYLE: Record<CautionLevel, string> = {
  높음: "bg-red-600 text-white",
  중간: "bg-amber-400 text-black",
  낮음: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
};

export default function CautionList({ cautions }: { cautions: GuideResult["cautions"] }) {
  const sorted = [...cautions].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-black dark:text-zinc-50">주의사항</h3>
      <ul className="flex flex-col gap-2">
        {sorted.map((c, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
          >
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[c.level]}`}>
              {c.level}
            </span>
            <span className="leading-6 text-black dark:text-zinc-100">{c.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
