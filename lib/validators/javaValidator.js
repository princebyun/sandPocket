/**
 * Java SAST Validator
 * Uses regex-based blacklist and import analysis to detect
 * dangerous Java code patterns (Runtime, IO, Reflection, etc.)
 * 
 * Inspired by SpotBugs / SonarQube rule sets.
 */

// ---- Forbidden import patterns ----
const FORBIDDEN_IMPORTS = [
  { pattern: /java\.lang\.Runtime/, message: "금지된 클래스: java.lang.Runtime (프로세스 실행 차단)" },
  { pattern: /java\.lang\.ProcessBuilder/, message: "금지된 클래스: java.lang.ProcessBuilder (프로세스 생성 차단)" },
  { pattern: /java\.io\./, message: "금지된 패키지: java.io.* (파일 시스템 접근 차단)" },
  { pattern: /java\.nio\.file\./, message: "금지된 패키지: java.nio.file.* (파일 시스템 접근 차단)" },
  { pattern: /java\.net\./, message: "금지된 패키지: java.net.* (네트워크 접근 차단)" },
  { pattern: /java\.lang\.reflect\./, message: "금지된 패키지: java.lang.reflect.* (리플렉션 차단)" },
  { pattern: /java\.security\./, message: "금지된 패키지: java.security.* (보안 API 접근 차단)" },
  { pattern: /java\.sql\./, message: "금지된 패키지: java.sql.* (데이터베이스 접근 차단)" },
  { pattern: /javax\.script\./, message: "금지된 패키지: javax.script.* (스크립트 엔진 차단)" },
  { pattern: /java\.lang\.ClassLoader/, message: "금지된 클래스: ClassLoader (동적 클래스 로딩 차단)" },
  { pattern: /java\.lang\.Thread/, message: "금지된 클래스: Thread (스레드 생성 차단)" },
  { pattern: /java\.util\.concurrent\./, message: "금지된 패키지: java.util.concurrent.* (멀티스레딩 차단)" },
];

// ---- Forbidden code patterns ----
const FORBIDDEN_PATTERNS = [
  { pattern: /Runtime\s*\.\s*getRuntime\s*\(/, message: "금지된 호출: Runtime.getRuntime() (시스템 명령 실행 차단)" },
  { pattern: /ProcessBuilder/, message: "금지된 클래스 사용: ProcessBuilder (프로세스 생성 차단)" },
  { pattern: /System\s*\.\s*exit\s*\(/, message: "금지된 호출: System.exit() (JVM 종료 차단)" },
  { pattern: /\.exec\s*\(/, message: "금지된 메서드: .exec() (명령 실행 차단)" },
  { pattern: /ClassLoader/, message: "금지된 클래스: ClassLoader (동적 클래스 로딩 차단)" },
  { pattern: /\.forName\s*\(/, message: "금지된 메서드: Class.forName() (리플렉션 차단)" },
  { pattern: /\.getDeclaredMethod/, message: "금지된 메서드: getDeclaredMethod() (리플렉션 차단)" },
  { pattern: /\.getDeclaredField/, message: "금지된 메서드: getDeclaredField() (리플렉션 차단)" },
  { pattern: /\.setAccessible\s*\(/, message: "금지된 메서드: setAccessible() (접근 제어 우회 차단)" },
  { pattern: /new\s+File\s*\(/, message: "금지된 객체 생성: new File() (파일 시스템 접근 차단)" },
  { pattern: /new\s+FileWriter|new\s+FileReader|new\s+FileInputStream|new\s+FileOutputStream/, message: "금지된 파일 I/O 객체 생성" },
  { pattern: /new\s+Socket\s*\(|new\s+ServerSocket\s*\(/, message: "금지된 소켓 생성 (네트워크 접근 차단)" },
  { pattern: /new\s+URL\s*\(|new\s+HttpURLConnection/, message: "금지된 네트워크 객체 생성" },
  { pattern: /ScriptEngine|ScriptEngineManager/, message: "금지된 스크립트 엔진 사용" },
  { pattern: /Unsafe\s*\.\s*getUnsafe|sun\.misc\.Unsafe/, message: "금지된 Unsafe 클래스 접근" },
  { pattern: /native\s+\w+/, message: "금지된 키워드: native (JNI 호출 차단)" },
];

/**
 * Validate Java code using regex-based blacklist analysis.
 * @param {string} code - Java source code
 * @returns {{safe: boolean, violations: Array<{message: string, line: number, node_type: string}>}}
 */
export function validateJava(code) {
  const violations = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip comments (single-line)
    if (trimmed.startsWith("//")) return;

    // Check import statements
    if (trimmed.startsWith("import ")) {
      for (const { pattern, message } of FORBIDDEN_IMPORTS) {
        if (pattern.test(line)) {
          violations.push({
            message,
            line: idx + 1,
            node_type: "ForbiddenImport",
          });
        }
      }
    }

    // Check all code patterns
    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          message,
          line: idx + 1,
          node_type: "ForbiddenPattern",
        });
      }
    }
  });

  // Multi-line block comment removal for deeper analysis
  const codeNoComments = code.replace(/\/\*[\s\S]*?\*\//g, "");
  const linesNoComments = codeNoComments.split("\n");

  // Additional checks on comment-stripped code for patterns
  // that might span multiple lines
  const fullCodeCheck = [
    { pattern: /Runtime[\s\S]*?getRuntime[\s\S]*?exec/m, message: "금지된 패턴: Runtime.getRuntime().exec() 체인 감지" },
  ];

  for (const { pattern, message } of fullCodeCheck) {
    if (pattern.test(codeNoComments)) {
      // Only add if not already detected
      const alreadyFound = violations.some(v => v.message.includes("Runtime"));
      if (!alreadyFound) {
        violations.push({
          message,
          line: 0,
          node_type: "MultiLinePattern",
        });
      }
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}
