"use client";

export default function SecurityAlert({ violations, type = "danger" }) {
  if (!violations || violations.length === 0) return null;

  if (type === "success") {
    return (
      <div className="security-alert success" id="security-alert-success">
        <span className="alert-icon">✅</span>
        <div className="alert-content">
          <h4>보안 검증 통과</h4>
          <p>코드가 안전한 것으로 확인되었습니다. 프로젝트를 등록할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-alert danger" id="security-alert-danger">
      <span className="alert-icon">⚠️</span>
      <div className="alert-content">
        <h4>보안 경고: 위험한 코드가 감지되었습니다</h4>
        <p>
          시스템 안전을 위해 특정 명령어는 사용할 수 없습니다.
          아래 항목을 수정한 후 다시 시도해 주세요.
        </p>
        <ul className="violation-list">
          {violations.map((v, i) => (
            <li key={i}>
              🚫 {v.message || v}
              {v.line ? ` (라인 ${v.line})` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
