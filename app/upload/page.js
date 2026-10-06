"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import CodeEditor from "@/components/CodeEditor";
import SecurityAlert from "@/components/SecurityAlert";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("game");
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Run SAST validation
  async function handleValidate() {
    if (!code.trim()) {
      setError("검사할 코드를 작성하거나 붙여넣어 주세요.");
      return;
    }
    setIsValidating(true);
    setError("");
    setValidationResult(null);

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const json = await res.json();

      if (json.success) {
        setValidationResult(json.data);
      } else {
        setError(json.error || "사전 검사 도중 시스템 오류가 발생했습니다.");
      }
    } catch (err) {
      setError("서버와의 통신 연결을 확인할 수 없습니다.");
    } finally {
      setIsValidating(false);
    }
  }

  // Submit project
  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      setError("프로젝트 제목과 소스코드를 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, language, code }),
      });
      const json = await res.json();

      if (json.success) {
        router.push(`/project/${json.data.id}`);
      } else {
        setError(json.error || "작품 등록에 실패했습니다.");
        if (json.violations) {
          setValidationResult({ safe: false, violations: json.violations });
        }
      }
    } catch (err) {
      setError("서버와의 통신 연결을 확인할 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <div className="page-wrapper">
        <div className="container">
          <div className="upload-card">
            <div style={{ marginBottom: "36px", borderBottom: "1px solid var(--border-light)", paddingBottom: "24px" }}>
              <div className="split-badge" style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}>
                <span>PROJECT REGISTRATION</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 700, margin: "8px 0" }}>
                새 바이브코딩 프로젝트 등록
              </h1>
              <p style={{ color: "var(--text-sub)", fontSize: "15px" }}>
                등록된 코드는 서버 SAST(정적 보안 검사)를 통과한 후, 방문자의 브라우저 내장 WASM 샌드박스에서 안전하게 구동됩니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} id="upload-form">
              {/* Title */}
              <div className="form-group">
                <label className="form-label" htmlFor="project-title">
                  프로젝트 제목 (필수)
                </label>
                <input
                  type="text"
                  className="input-field"
                  id="project-title"
                  placeholder="예: AI로 구현한 캔버스 아케이드 게임"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="project-desc">
                  프로젝트 소개 및 플레이 설명 (선택)
                </label>
                <textarea
                  className="input-field"
                  id="project-desc"
                  placeholder="어떤 프롬프트나 AI 코딩 도구를 활용했는지, 조작법이나 특징을 입력해 주세요."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  style={{ minHeight: "100px", resize: "vertical" }}
                />
              </div>

              {/* Category & Language */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="project-category">
                    분류 카테고리
                  </label>
                  <select
                    className="input-field"
                    id="project-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="game">인터랙티브 게임 (Game)</option>
                    <option value="website">웹 & 알고리즘 (Web/App)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="project-language">
                    실행 언어 환경
                  </label>
                  <select
                    className="input-field"
                    id="project-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="python">Python 3.12 (Pyodide WASM)</option>
                    <option value="java">Java 8 (CheerpJ JVM)</option>
                  </select>
                </div>
              </div>

              {/* Code Editor */}
              <div className="form-group">
                <label className="form-label">프로그램 소스 코드 (필수)</label>
                <CodeEditor
                  code={code}
                  onChange={setCode}
                  language={language}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleValidate}
                  disabled={isValidating || !code.trim()}
                  id="validate-btn"
                  style={{ minWidth: "200px" }}
                >
                  {isValidating ? "SAST 구문 분석 중..." : "🛡️ 보안 무해성 사전 검사"}
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !title.trim() || !code.trim()}
                  id="submit-btn"
                  style={{ flex: 1, minWidth: "240px" }}
                >
                  {isSubmitting ? "작품 검증 및 저장 중..." : "✓ 검증 통과 후 작품 등록하기"}
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="security-alert danger" style={{ marginTop: "16px" }}>
                  <span>⚠️</span>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: "4px" }}>확인 필요</h4>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Validation Result */}
              {validationResult && (
                <div style={{ marginTop: "16px" }}>
                  {validationResult.safe ? (
                    <SecurityAlert type="success" violations={[]} />
                  ) : (
                    <SecurityAlert type="danger" violations={validationResult.violations} />
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
