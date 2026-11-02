// Design Ref: §5.3 StatusMessage — 오류 안내와 다시 시도 버튼 (입력 내용은 지우지 않음)
interface Props {
  message: string;
  onRetry?: () => void;
}

export default function StatusMessage({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
