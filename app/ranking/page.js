"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function RankingPage() {
  const [projects, setProjects] = useState([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setLoading(true);
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/projects?sort=ranking&category=${category}`);
        const json = await res.json();
        if (!ignore && json.success) {
          setProjects(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch ranking projects:", err);
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

  const getRankBadge = (index) => {
    if (index === 0) return { label: "1위", color: "#ffffff", bg: "var(--primary)" };
    if (index === 1) return { label: "2위", color: "#ffffff", bg: "var(--dark)" };
    if (index === 2) return { label: "3위", color: "#ffffff", bg: "#475569" };
    return { label: `${index + 1}위`, color: "var(--text-sub)", bg: "var(--bg-body)" };
  };

  return (
    <>
      <Header />
      <div className="page-wrapper">
        <div className="container">
          {/* Ranking Header Banner */}
          <div
            style={{
              textAlign: "center",
              padding: "50px 28px 40px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border-light)",
              boxShadow: "var(--shadow-card)",
              marginBottom: "36px",
              marginTop: "20px",
            }}
          >
            <div className="split-badge" style={{ margin: "0 auto 16px", background: "var(--primary-subtle)", color: "var(--primary)" }}>
              <span>LIVE HALL OF FAME</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px" }}>
              실시간 인기 프로젝트 랭킹
            </h1>
            <p style={{ color: "var(--text-sub)", fontSize: "16px", maxWidth: "600px", margin: "0 auto 28px" }}>
              WebAssembly 샌드박스에서 실시간으로 구동된 <strong>누적 실행 수(Play Count)</strong>를 기준으로 선정된 명예의 전당입니다.
            </p>

            {/* Category Filter Tabs */}
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              {[
                { id: "all", name: "전체 랭킹" },
                { id: "game", name: "🎮 인터랙티브 게임 TOP" },
                { id: "website", name: "⚡ 웹 & 알고리즘 TOP" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleCategoryChange(tab.id)}
                  className={`filter-btn ${category === tab.id ? "active" : ""}`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ranking List View */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
              랭킹 데이터를 집계하고 있습니다...
            </div>
          ) : projects.length === 0 ? (
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-card)",
                padding: "60px 40px",
                textAlign: "center",
                border: "1px solid var(--border-light)",
                marginBottom: "80px",
              }}
            >
              <h3>등록된 랭킹 데이터가 없습니다</h3>
              <p style={{ color: "var(--text-sub)", margin: "8px 0 20px" }}>
                첫 프로젝트를 업로드하고 실행 카운트를 쌓아 1위에 도전해 보세요!
              </p>
              <Link href="/upload" className="btn btn-primary">
                첫 작품 등록하기 →
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "80px" }}>
              {projects.map((p, idx) => {
                const badge = getRankBadge(idx);
                const isTop3 = idx < 3;
                return (
                  <Link
                    key={p.id}
                    href={`/project/${p.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "24px 32px",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-light)",
                      borderRadius: "var(--radius-card)",
                      textDecoration: "none",
                      color: "inherit",
                      boxShadow: isTop3 ? "var(--shadow-card)" : "var(--shadow-sm)",
                      transition: "all var(--transition)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.borderColor = "var(--primary-light)";
                      e.currentTarget.style.boxShadow = "var(--shadow-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "var(--border-light)";
                      e.currentTarget.style.boxShadow = isTop3 ? "var(--shadow-card)" : "var(--shadow-sm)";
                    }}
                  >
                    {/* Left: Rank & Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: badge.color,
                          backgroundColor: badge.bg,
                          minWidth: "56px",
                          height: "36px",
                          borderRadius: "var(--radius-pill)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {badge.label}
                      </div>

                      <div style={{ fontSize: "32px", flexShrink: 0 }}>
                        {p.category === "game" ? "🕹️" : "⚡"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                          <h3
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "18px",
                              fontWeight: 700,
                              color: "var(--text-main)",
                              margin: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {p.title}
                          </h3>
                          <span className={`badge badge-${p.language}`}>
                            {p.language.toUpperCase()}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "var(--text-sub)",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.description || "등록된 소개 글이 없는 프로젝트입니다."}
                        </p>
                      </div>
                    </div>

                    {/* Right: Play Count Pill */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginLeft: "24px", flexShrink: 0 }}>
                      <div
                        style={{
                          padding: "8px 20px",
                          borderRadius: "var(--radius-pill)",
                          backgroundColor: isTop3 ? "var(--primary-subtle)" : "var(--bg-body)",
                          color: isTop3 ? "var(--primary)" : "var(--text-sub)",
                          fontWeight: 700,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>▶ 실행</span>
                        <strong style={{ fontSize: "16px", color: isTop3 ? "var(--primary)" : "var(--text-main)" }}>
                          {p.play_count || 0}
                        </strong>
                        <span>회</span>
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "20px" }}>➔</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
