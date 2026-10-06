"use client";

export default function CodeEditor({ code, onChange, language, readOnly = false }) {
  const filename = language === "python" ? "main.py" : language === "java" ? "Main.java" : "source_code";
  const langName = language === "python" ? "Python 3.12 (Pyodide WASM)" : "Java 8 (CheerpJ JVM)";
  const lineCount = (code || "").split("\n").length;

  const handleKeyDown = (e) => {
    if (readOnly) return;
    // Allow Tab key to indent with 4 spaces instead of unfocusing
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      onChange?.(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="code-editor-box" id="code-editor">
      <div className="code-editor-top">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>💻 {filename}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
          <span>{langName}</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>{lineCount} 라인</span>
        </div>
      </div>

      {readOnly ? (
        <pre className="code-viewer">{code}</pre>
      ) : (
        <textarea
          className="code-textarea"
          value={code}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            language === "python"
              ? `# AI가 작성한 Python 게임 또는 알고리즘 코드를 입력하세요.\nimport time\nprint("Hello, SandPocket Robotori Sandbox!")`
              : language === "java"
              ? `// AI가 작성한 Java 소스 코드를 입력하세요.\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, SandPocket!");\n    }\n}`
              : "코드를 입력해 주세요..."
          }
          spellCheck={false}
          id="code-textarea"
        />
      )}
    </div>
  );
}
