/**
 * Unified SAST Validator
 * Routes validation to the appropriate language-specific validator.
 */

import { validatePython } from "./pythonValidator.js";
import { validateJava } from "./javaValidator.js";

/**
 * Validate code based on the specified language.
 * @param {string} code - Source code to validate
 * @param {string} language - "python" or "java"
 * @returns {{safe: boolean, violations: Array}}
 */
export async function validateCode(code, language) {
  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return {
      safe: false,
      violations: [{ message: "코드가 비어 있습니다.", line: 0, node_type: "Empty" }],
    };
  }

  // Code length limit (100KB)
  if (code.length > 100_000) {
    return {
      safe: false,
      violations: [{ message: "코드가 너무 깁니다 (최대 100KB).", line: 0, node_type: "SizeLimit" }],
    };
  }

  switch (language) {
    case "python":
      return await validatePython(code);
    case "java":
      return validateJava(code);
    default:
      return {
        safe: false,
        violations: [{ message: `지원하지 않는 언어: ${language}`, line: 0, node_type: "UnsupportedLanguage" }],
      };
  }
}
