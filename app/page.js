"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import CategoryFilter from "@/components/CategoryFilter";

export default function HomePage() {
  const [projects, setProjects] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setLoading(true);
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/projects?category=${category}`);
        const json = await res.json();
        if (!ignore && json.success) {
          setProjects(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [category]);

  const filteredProjects = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <Header />
      <div className="page-wrapper">
        <div className="container">
          {/* =========================================================
              Robotori Style: 50:50 Split Intro Hero
              Reference: https://robotori.co.kr/v2/index/html/main/intro.html
              Platform Identity: SandPocket Studio vs Creator Archive
              ========================================================= */}
          <section className="split-hero-container" id="hero-section" style={{ paddingTop: "20px" }}>
            <div className="split-hero">
              {/* Left Panel: SandPocket Studio (Royal Blue) */}
              <div className="split-panel studio-side python-side">
                <div>
                  <div className="split-badge">
                    <span>⚡ CLIENT-SIDE WASM SANDBOX</span>
                  </div>
                  <h1 className="split-title">
                    AI 바이브코딩의 시작,<br />
                    브라우저에서 즉시 구동되는<br />
                    초경량 WASM 플레이그라운드
                  </h1>
                  <p className="split-desc">
                    서버 설치나 클라우드 비용 없이 브라우저 내부 WebAssembly 가상 환경에서
                    Python과 Java 코드를 안전하게 직접 제작하고 즉시 테스트해 보세요.
                  </p>
                </div>

                <div>
                  <Link href="/upload" className="robotori-pill-btn">
                    <span>새 프로젝트 만들기</span>
                    <span className="btn-arrow">➔</span>
                  </Link>
                </div>
              </div>

              {/* Right Panel: Creator Showcase (Solid Rich Black) */}
              <div className="split-panel archive-side java-side">
                <div>
                  <div className="split-badge" style={{ background: "rgba(255,255,255,0.12)" }}>
                    <span>🌐 OPEN CREATIVE ARCHIVE</span>
                  </div>
                  <h1 className="split-title">
                    상상을 현실로,<br />
                    크리에이터들의 창작물을<br />
                    함께 즐기는 오픈 아카이브
                  </h1>
                  <p className="split-desc">
                    커뮤니티 개발자들이 AI와 함께 창작한 인터랙티브 Canvas 게임, 알고리즘,
                    웹 유틸리티를 자유롭게 실행하고 소스코드를 분석해 보세요.
                  </p>
                </div>

                <div>
                  <a href="#project-list" className="robotori-pill-btn">
                    <span>창작 갤러리 둘러보기</span>
                    <span className="btn-arrow">➔</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              Platform Highlights (Feature Ribbon)
              ========================================================= */}
          <section className="feature-ribbon-section" id="features">
            <div className="feature-ribbon-grid">
              <div className="feature-ribbon-card">
                <div className="feature-ribbon-icon">🔒</div>
                <div className="feature-ribbon-content">
                  <h3>100% 클라이언트 격리 샌드박스</h3>
                  <p>Web Worker 스레드 격리와 자동 타임아웃으로 UI 멈춤이나 무한루프를 원천 차단합니다.</p>
                </div>
              </div>

              <div className="feature-ribbon-card">
                <div className="feature-ribbon-icon">⚡</div>
                <div className="feature-ribbon-content">
                  <h3>제로 설치 즉시 실행</h3>
                  <p>Pyodide(Python 3.12) 및 CheerpJ(JVM) 런타임 내장으로 어떤 환경에서든 즉각 로컬 구동됩니다.</p>
                </div>
              </div>

              <div className="feature-ribbon-card">
                <div className="feature-ribbon-icon">🛡️</div>
                <div className="feature-ribbon-content">
                  <h3>사전 SAST 정적 보안 검증</h3>
                  <p>악성 시스템 호출, 로컬 파일 탈취 시도를 AST 기반으로 자동 검증하여 안전한 코드만 공유됩니다.</p>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              Robotori Bento Grid Section (Community Project Board)
              ========================================================= */}
          <section id="project-list" style={{ paddingTop: "20px" }}>
            <div className="section-header">
              <div className="section-title-wrap">
                <h2>커뮤니티 창작 갤러리</h2>
                <p>전 세계 크리에이터들이 AI와 함께 창작한 인터랙티브 프로젝트 컬렉션</p>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <CategoryFilter current={category} onChange={handleCategoryChange} />

                <div style={{ position: "relative", minWidth: "260px" }}>
                  <input
                    type="text"
                    placeholder="프로젝트 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field"
                    style={{ minHeight: "44px", paddingLeft: "18px", fontSize: "14px" }}
                    id="search-input"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)" }}>
                프로젝트 목록을 불러오는 중입니다...
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="bento-grid" id="project-grid">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-card)",
                  padding: "60px 40px",
                  textAlign: "center",
                  border: "1px solid var(--border-light)",
                  marginBottom: "80px",
                }}
                id="empty-state"
              >
                <div style={{ fontSize: "52px", marginBottom: "16px" }}>🏖️</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "22px", marginBottom: "8px" }}>
                  해당 조건의 프로젝트가 아직 없습니다
                </h3>
                <p style={{ color: "var(--text-sub)", marginBottom: "24px" }}>
                  AI 코딩 도구로 제작한 여러분만의 첫 번째 프로젝트를 등록해 보세요!
                </p>
                <Link href="/upload" className="btn btn-primary">
                  새 프로젝트 등록하기 →
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
