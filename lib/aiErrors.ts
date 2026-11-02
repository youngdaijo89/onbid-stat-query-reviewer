// 선택한 AI 공급자가 아직 구현되지 않았을 때 (Design Ref: §2.4)
// lib/ai.ts와 각 공급자 파일이 서로를 불러오지 않도록 따로 둔다.
export class AiNotReadyError extends Error {}
