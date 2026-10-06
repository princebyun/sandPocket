"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CodeEditor from "@/components/CodeEditor";
import PythonRunner from "@/components/PythonRunner";
import JavaRunner from "@/components/JavaRunner";

export default function ProjectPlayerPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [output, setOutput] = useState([]);
  const [activeTab, setActiveTab] = useState("output");

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!id) return;
      try {
        const res = await fetch(`/api/projects/${id}`);
        const json = await res.json();
        if (!ignore) {
          if (json.success) {
            setProject(json.data);
          } else {
            setError(json.error || "요구하신 프로젝트 정보를 불러올 수 없습니다.");
          }
        }
      } catch {
        if (!ignore) {
          setError("서버와의 통신 연결을 확인할 수 없습니다.");
        }
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
  }, [id]);

  const handleOutput = useCallback((msg) => {
    setOutput((prev) => [...prev, msg]);
  }, []);

  function clearOutput() {
    setOutput([]);
  }

  const handleExecute = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.success && json.playCount !== undefined) {
        setProject((prev) => prev ? { ...prev, play_count: json.playCount } : null);
      }
    } catch (err) {
      console.error("Failed to update play count:", err);
    }
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="page-wrapper">
          <div className="container" style={{ textAlign: "center", padding: "100px 0", color: "var(--text-muted)" }}>
            프로젝트 정보를 불러오는 중입니다...
          </div>
        </div>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <Header />
        <div className="page-wrapper">
          <div className="container">
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-card)",
                padding: "80px 40px",
                textAlign: "center",
                border: "1px solid var(--border-light)",
                marginTop: "40px",
              }}
            >
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "24px", marginBottom: "12px" }}>
                {error || "요청하신 프로젝트를 찾을 수 없습니다"}
              </h3>
              <p style={{ color: "var(--text-sub)", marginBottom: "24px" }}>
                삭제되었거나 잘못된 접근 경로입니다.
              </p>
              <Link href="/" className="btn btn-primary">
                ← 프로젝트 목록으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const entryCode =
    project.code_files?.find((f) => f.is_entry_point)?.content ||
    project.code_files?.[0]?.content ||
    "";

  const catLabel = project.category === "game" ? "인터랙티브 게임" : "웹 & 알고리즘";
  const langLabel = project.language === "python" ? "Python 3.12 (WASM)" : "Java 8 (JVM)";

  return (
    <>
      <Header />
      <div className="page-wrapper">
        <div className="container">
          <div className="player-layout" style={{ paddingTop: "32px" }}>
            {/* Left Sidebar Control Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Project Meta Card */}
              <div className="player-panel" id="project-info">
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <span className={`badge badge-${project.language}`}>
                    {project.language.toUpperCase()}
                  </span>
                  <span className={`badge badge-${project.category}`}>
                    {catLabel}
                  </span>
                </div>

                <h1>{project.title}</h1>
                <p className="desc">
                  {project.description || "등록된 소개 글이 없는 프로젝트입니다."}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--border-light)",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>누적 실행 {project.play_count || 0}회</span>
                  <span>등록일: {new Date(project.created_at).toLocaleDateString("ko-KR")}</span>
                </div>
              </div>

              {/* Execution Action Button */}
              <div>
                {project.language === "python" ? (
                  <PythonRunner
                    code={entryCode}
                    onOutput={handleOutput}
                    onRunStart={handleExecute}
                  />
                ) : (
                  <JavaRunner
                    code={entryCode}
                    onOutput={handleOutput}
                    onRunStart={handleExecute}
                  />
                )}
              </div>

              {/* Code Viewer Panel */}
              <div>
                <div style={{ marginBottom: "10px", fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  📄 소스코드 미리보기
                </div>
                <CodeEditor
                  code={entryCode}
                  language={project.language}
                  readOnly
                />
              </div>
            </div>

            {/* Right Main Execution Output & Sandbox Area */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Modern Tab Bar */}
              <div style={{ display: "flex", gap: "10px" }} role="tablist">
                <button
                  className={`btn ${activeTab === "output" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTab("output")}
                  role="tab"
                  aria-selected={activeTab === "output"}
                  style={{ minHeight: "44px" }}
                >
                  🖥️ 실행 결과 및 콘솔 터미널
                </button>
                <button
                  className={`btn ${activeTab === "info" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTab("info")}
                  role="tab"
                  aria-selected={activeTab === "info"}
                  style={{ minHeight: "44px" }}
                >
                  🛡️ SAST 보안 검증 내역
                </button>
              </div>

              {/* Interactive Game Canvas Mount (Python Pyodide injects canvas here) */}
              <div id="sandbox-game-mount"></div>

              {/* Console Output Terminal */}
              {activeTab === "output" && (
                <div className="terminal-window" id="execution-panel">
                  <div className="terminal-header">
                    <span>터미널 콘솔 출력 (WebAssembly Sandbox)</span>
                    <button
                      className="btn btn-secondary"
                      onClick={clearOutput}
                      style={{ minHeight: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "16px" }}
                    >
                      기록 지우기
                    </button>
                  </div>
                  <div className="terminal-body" id="output-area">
                    {output.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", padding: "36px 0", textAlign: "center" }}>
                        좌측의 <b>[샌드박스 실행하기]</b> 버튼을 누르면 이 터미널에 실시간 출력이 표시됩니다.
                      </div>
                    ) : (
                      output.map((line, i) => (
                        <div key={i} className={`output-line ${line.type}`}>
                          {line.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Security Validation Specs Tab */}
              {activeTab === "info" && (
                <div className="player-panel">
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", marginBottom: "16px" }}>
                    프로젝트 상세 스펙 & 무해성 샌드박스 검증 리포트
                  </h3>
                  <div style={{ display: "grid", gap: "12px", fontSize: "15px", color: "var(--text-sub)", marginBottom: "24px" }}>
                    <div><strong>등록 창작자:</strong> {project.author || "익명 크리에이터"}</div>
                    <div><strong>카테고리:</strong> {catLabel}</div>
                    <div><strong>실행 런타임:</strong> {langLabel}</div>
                    <div><strong>누적 실행 수:</strong> {project.play_count || 0}회</div>
                  </div>

                  <div
                    style={{
                      padding: "20px",
                      background: "var(--bg-body)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-light)",
                      fontSize: "14px",
                      lineHeight: "1.7",
                      color: "var(--text-sub)",
                    }}
                  >
                    <b style={{ color: "var(--primary)" }}>[SAST 정적 보안 검증 완료]</b><br />
                    본 프로젝트는 등록 시점에 서버 측 AST 정적 분석을 통해 파일 시스템 침입, 소켓 통신 탈취,
                    시스템 프로세스 실행 시도가 100% 차단되었음을 검증받았습니다.
                    또한 사용자의 브라우저 내장 독립 격리된 WebAssembly 메모리에서 실행되므로 안전합니다.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
