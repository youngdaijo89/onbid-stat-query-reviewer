import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 글꼴 파일은 app/fonts에 넣어 두고 쓴다 — 인터넷이 없는 내부망에서도 빌드되게 (구글 글꼴 내려받기 없음, INTRANET.md)
const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// 첫 화면 머리 영역의 영문 장식 글자 전용 (한글 글자는 없어서 한글에는 쓰지 않음)
const urbanist = localFont({
  src: "./fonts/urbanist-latin.woff2",
  variable: "--font-urbanist",
  weight: "600 700",
});

export const metadata: Metadata = {
  title: "온비드 통계 요청 쿼리 리뷰어",
  description: "감사·자료 제출용 통계 쿼리 작성 가이드와 결과 엑셀 점검 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${urbanist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
