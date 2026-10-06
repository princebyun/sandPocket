import { Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-noto",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-google",
  display: "swap",
});

export const metadata = {
  title: "SandPocket | 바이브코딩 프로젝트 공유 플랫폼",
  description:
    "AI 활용 코딩(바이브코딩)으로 만든 게임과 웹사이트를 공유하고, 브라우저에서 안전하게 실행해 보세요.",
  keywords: ["바이브코딩", "AI 코딩", "코드 공유", "Python", "Java", "샌드박스"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${jetbrainsMono.variable}`}>
      <body className={notoSansKr.className}>
        {children}
      </body>
    </html>
  );
}
