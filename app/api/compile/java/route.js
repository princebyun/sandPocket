import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { validateCode } from "@/lib/validators/index";

/**
 * POST /api/compile/java
 * Ultra-fast native Java bytecode compilation and JAR packaging.
 * Emits a Java 8 compatible JAR file ready for instant execution in CheerpJ.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "컴파일할 자바 소스코드를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 1. Security SAST Validation
    const validation = await validateCode(code, "java");
    if (!validation.safe) {
      return NextResponse.json(
        {
          success: false,
          error: "보안 검사 통과 실패: 금지된 Java API 또는 패키지가 감지되었습니다.",
          violations: validation.violations,
        },
        { status: 400 }
      );
    }

    // 2. Extract class name (default Main)
    const match = code.match(/(?:public\s+)?class\s+([A-Za-z0-9_]+)/);
    const className = match ? match[1] : "Main";

    // 3. Isolated temp directory for compilation & packaging
    const buildId = uuidv4();
    const tempDir = path.join(os.tmpdir(), `sandpocket-javac-${buildId}`);
    const classesDir = path.join(tempDir, "classes");
    await fs.promises.mkdir(classesDir, { recursive: true });

    const javaFilePath = path.join(tempDir, `${className}.java`);
    await fs.promises.writeFile(javaFilePath, code, "utf-8");

    // 4. Compile with native javac targeted to Java 8 bytecode
    const startTime = Date.now();
    const compileResult = await new Promise((resolve) => {
      exec(
        `javac --release 8 -encoding utf-8 -d "${classesDir}" "${javaFilePath}"`,
        { timeout: 6000, encoding: "utf-8" },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              error: (stderr || stdout || error.message || "").trim(),
            });
          } else {
            resolve({ success: true });
          }
        }
      );
    });

    if (!compileResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: compileResult.error,
        },
        { status: 400 }
      );
    }

    // 5. Package compiled classes into standard JAR file with Main-Class manifest
    const jarFilePath = path.join(tempDir, `${buildId}.jar`);
    await new Promise((resolve, reject) => {
      exec(
        `jar cfe "${jarFilePath}" ${className} -C "${classesDir}" .`,
        { timeout: 4000 },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    // 6. Ensure JAR exists
    await fs.promises.access(jarFilePath);

    const elapsedMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      buildId,
      className,
      jarPath: `/api/compile/java/${buildId}.jar`,
      elapsedMs,
    });
  } catch (error) {
    console.error("[API] POST /api/compile/java error:", error);
    return NextResponse.json(
      { success: false, error: "자바 컴파일 처리 중 서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
