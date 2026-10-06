"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="header-logo">
          <span>SANDPOCKET</span>
          <span className="logo-dot">.</span>
        </Link>

        <nav className="header-nav">
          <Link
            href="/"
            className={`nav-link ${pathname === "/" ? "active" : ""}`}
          >
            프로젝트 샌드박스
          </Link>
          <Link
            href="/ranking"
            className={`nav-link ${pathname === "/ranking" ? "active" : ""}`}
          >
            인기 랭킹
          </Link>
          <Link
            href="/upload"
            className={`nav-link ${pathname === "/upload" ? "active" : ""}`}
          >
            작품 등록 가이드
          </Link>
          <Link href="/upload" className="gnb-btn">
            새 프로젝트 등록 →
          </Link>
        </nav>
      </div>
    </header>
  );
}
