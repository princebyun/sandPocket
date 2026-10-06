/**
 * Python SAST Validator
 * Invokes the Python AST checker script for deep code analysis.
 * Falls back to regex-based checking if Python is not available.
 */

import { exec } from "child_process";
import path from "path";

const CHECKER_PATH = path.join(process.cwd(), "lib", "sast", "python_ast_checker.py");

// Fallback regex patterns when Python is unavailable
const FALLBACK_PATTERNS = [
  { pattern: /\bimport\s+(os|subprocess|sys|socket|shutil|ctypes|importlib|signal|multiprocessing|threading|http|urllib|requests|pickle|shelve|tempfile|glob|pathlib|webbrowser)\b/, message: "금지된 모듈 import 감지" },
  { pattern: /\bfrom\s+(os|subprocess|sys|socket|shutil|ctypes|importlib|signal|multiprocessing|threading|http|urllib|requests|pickle|shelve|tempfile|glob|pathlib|webbrowser)\b/, message: "금지된 모듈 from-import 감지" },
  { pattern: /\beval\s*\(/, message: "금지된 함수: eval() 사용 감지" },
  { pattern: /\bexec\s*\(/, message: "금지된 함수: exec() 사용 감지" },
  { pattern: /\bcompile\s*\(/, message: "금지된 함수: compile() 사용 감지" },
  { pattern: /\bopen\s*\(/, message: "금지된 함수: open() 파일 접근 감지" },
  { pattern: /\b__import__\s*\(/, message: "금지된 함수: __import__() 동적 임포트 감지" },
  { pattern: /__subclasses__|__globals__|__builtins__|__code__/, message: "금지된 내부 속성 접근 감지" },
  { pattern: /os\.system|os\.popen|subprocess\.run|subprocess\.call/, message: "금지된 시스템 명령 실행 감지" },
];

/**
 * Execute command asynchronously with stdin input and strict timeout
 */
function runCheckerAsync(cmd, input, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const child = exec(
      cmd,
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      },
      (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      }
    );

    if (child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

/**
 * Validate Python code using AST-based analysis asynchronously.
 * Non-blocking for the Node.js event loop.
 * @param {string} code - Python source code
 * @returns {Promise<{safe: boolean, violations: Array<{message: string, line?: number, node_type?: string}>}>}
 */
export async function validatePython(code) {
  // First, run instant fast regex scan as a zero-cost heuristic
  const fastViolations = [];
  const lines = code.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    for (const { pattern, message } of FALLBACK_PATTERNS) {
      if (pattern.test(line)) {
        fastViolations.push({ message, line: idx + 1, node_type: "RegexFastScan" });
      }
    }
  }

  // If blatant violations already exist, return immediately without spawning child processes
  if (fastViolations.length > 0) {
    return { safe: false, violations: fastViolations };
  }

  // Otherwise, run deep AST check via Python asynchronously
  try {
    const stdout = await runCheckerAsync(`python "${CHECKER_PATH}"`, code, 2500);
    return JSON.parse(stdout.trim());
  } catch {
    try {
      const stdout = await runCheckerAsync(`python3 "${CHECKER_PATH}"`, code, 2500);
      return JSON.parse(stdout.trim());
    } catch {
      // Safe fallback to regex validation
      return validatePythonFallback(code);
    }
  }
}

/**
 * Fallback regex-based validation when Python is not available.
 */
function validatePythonFallback(code) {
  const violations = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith("#")) return;

    for (const { pattern, message } of FALLBACK_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          message,
          line: idx + 1,
          node_type: "RegexMatch",
        });
      }
    }
  });

  return {
    safe: violations.length === 0,
    violations,
  };
}
