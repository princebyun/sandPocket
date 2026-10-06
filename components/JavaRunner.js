"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function JavaRunner({ code, onOutput, onRunStart, autoRun = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const hasInitRef = useRef(false);
  const initPromiseRef = useRef(null);
  const hasRunRef = useRef(false);
  
  // Compilation cache ref to achieve 0ms re-runs
  const lastCompiledCodeRef = useRef(null);
  const lastCompiledClassRef = useRef(null);
  const lastJarPathRef = useRef(null);

  const initCheerpJ = useCallback(async () => {
    if (typeof window === "undefined") return false;

    if (window._cheerpjInitialized && window.cheerpjRunMain) {
      setIsReady(true);
      return true;
    }

    if (window._cheerpjInitPromise) {
      return await window._cheerpjInitPromise;
    }

    setIsLoading(true);
    setStatusMsg("CheerpJ JVM WebAssembly 런타임 준비 중...");
    onOutput?.({ type: "system", text: "[System] Java 8 (CheerpJ WASM JVM) 엔진을 로딩하고 초기화하고 있습니다..." });

    window._cheerpjInitPromise = (async () => {
      try {
        if (!window.cheerpjInit) {
          const script = document.createElement("script");
          script.src = "https://cjrtnc.leaningtech.com/4.3/loader.js";
          script.async = true;
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error("CheerpJ 4.3 CDN 스크립트 로드에 실패했습니다."));
            document.head.appendChild(script);
          });
        }

        try {
          await window.cheerpjInit({
            version: 8,
          });
        } catch (initErr) {
          if (!initErr?.message?.includes("Already initialized")) {
            throw initErr;
          }
        }

        window._cheerpjInitialized = true;
        hasInitRef.current = true;
        setIsReady(true);
        setIsLoading(false);
        setStatusMsg("");
        onOutput?.({ type: "system", text: "[System] CheerpJ JVM WASM 엔진 준비 완료! 바이트코드 실행이 가능합니다." });
        return true;
      } catch (err) {
        setIsLoading(false);
        setStatusMsg("");
        onOutput?.({
          type: "stderr",
          text: `[Error] CheerpJ 런타임 초기화 실패: ${err.message}`,
        });
        window._cheerpjInitPromise = null;
        return false;
      }
    })();

    return await window._cheerpjInitPromise;
  }, [onOutput]);

  const runCode = useCallback(async () => {
    onRunStart?.();
    const ready = await initCheerpJ();
    if (!ready || !window.cheerpjRunMain) return;

    setIsLoading(true);

    // Extract class name from code (default to Main)
    const match = code?.match(/(?:public\s+)?class\s+([A-Za-z0-9_]+)/);
    const className = match ? match[1] : "Main";

    // Override console to intercept stdout/stderr from CheerpJ JVM
    const origLog = console.log;
    const origErr = console.error;

    try {
      console.log = (...args) => {
        origLog.apply(console, args);
        const text = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
        if (text === "CheerpJ runtime ready" || text === "Class is loaded, main is starting") {
          onOutput?.({ type: "system", text: `[JVM] ${text}` });
          return;
        }
        if (text.startsWith("CheerpJ: [debug]")) {
          return;
        }
        onOutput?.({ type: "stdout", text: text + "\n" });
      };

      console.error = (...args) => {
        origErr.apply(console, args);
        const text = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
        onOutput?.({ type: "stderr", text: text + "\n" });
      };

      onOutput?.({ type: "system", text: "\n--- Java 실행 시작 ---" });

      // ========================================================
      // 1. Check Memory Cache (0ms instant execution)
      // ========================================================
      if (
        lastCompiledCodeRef.current === code &&
        lastCompiledClassRef.current === className &&
        lastJarPathRef.current
      ) {
        onOutput?.({ type: "system", text: "⚡ [Instant Cache] 소스코드가 변경되지 않아 컴파일을 건너뛰고 즉시 재실행합니다 (0.0s)." });
        setStatusMsg("JVM에서 바이트코드 실행 중...");
        const runExit = await window.cheerpjRunMain(className, lastJarPathRef.current);
        onOutput?.({ type: "system", text: `\n--- Java 실행 종료 (exit code: ${runExit}) ---\n` });
        return;
      }

      // ========================================================
      // 2. Ultra-Fast Native Javac + JAR API Compilation (~0.3s)
      // ========================================================
      let compiledViaFastApi = false;
      setStatusMsg("초고속 네이티브 컴파일러로 바이트코드 빌드 중 (0.3초)...");

      try {
        const compileRes = await fetch("/api/compile/java", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const compileJson = await compileRes.json();

        if (compileJson.success && compileJson.jarPath) {
          const elapsed = compileJson.elapsedMs ? `${(compileJson.elapsedMs / 1000).toFixed(2)}s` : "0.3s";
          onOutput?.({ type: "system", text: `⚡ [Fast Javac] 네이티브 고속 컴파일 & JAR 패키징 완료 (소요시간: ${elapsed})` });

          compiledViaFastApi = true;
          const appJarPath = `/app${compileJson.jarPath}`;
          lastCompiledCodeRef.current = code;
          lastCompiledClassRef.current = className;
          lastJarPathRef.current = appJarPath;

          // CheerpJ loads the compiled JAR through its HTTP VFS mount (/app/...)
          setStatusMsg("JVM에서 바이트코드 실행 중...");
          onOutput?.({ type: "system", text: `[System] 브라우저 JVM에서 '${className}' 클래스를 실행합니다.\n` });

          const runExit = await window.cheerpjRunMain(className, appJarPath);
          onOutput?.({ type: "system", text: `\n--- Java 실행 종료 (exit code: ${runExit}) ---\n` });
          return;
        } else if (compileJson.error && compileRes.status === 400) {
          // Actual Java syntax or SAST error
          onOutput?.({ type: "stderr", text: `\n[Compile Error]\n${compileJson.error}` });
          return;
        }
      } catch (apiErr) {
        console.warn("Fast compile API unreachable, falling back to in-browser compiler:", apiErr);
      }

      // ========================================================
      // 3. Fallback: In-browser WebAssembly Javac (tools.jar)
      // ========================================================
      if (!compiledViaFastApi) {
        setStatusMsg("브라우저 내장 WASM javac으로 컴파일 중...");
        onOutput?.({ type: "system", text: "[System] 브라우저 내장 WASM javac(tools.jar)로 컴파일을 진행합니다..." });

        if (window.cheerpOSAddStringFile) {
          window.cheerpOSAddStringFile(`/str/${className}.java`, code || "");
        }

        const compileExit = await window.cheerpjRunMain(
          "com.sun.tools.javac.Main",
          "/app/tools.jar",
          "-d",
          "/files/",
          `/str/${className}.java`
        );

        if (compileExit !== 0) {
          onOutput?.({ type: "stderr", text: `\n[Error] Java 컴파일 실패 (exit code: ${compileExit}). 문법 오류를 점검해 주세요.` });
          return;
        }

        lastCompiledCodeRef.current = code;
        lastCompiledClassRef.current = className;
        lastJarPathRef.current = "/files/";

        setStatusMsg("JVM에서 바이트코드 실행 중...");
        onOutput?.({ type: "system", text: `[System] 컴파일 성공! JVM에서 '${className}' 클래스를 구동합니다.\n` });

        const runExit = await window.cheerpjRunMain(className, "/files/");
        onOutput?.({ type: "system", text: `\n--- Java 실행 종료 (exit code: ${runExit}) ---\n` });
      }
    } catch (err) {
      onOutput?.({
        type: "stderr",
        text: `[Runtime Error]\n${err.message}`,
      });
    } finally {
      console.log = origLog;
      console.error = origErr;
      setIsLoading(false);
      setStatusMsg("");
    }
  }, [code, initCheerpJ, onOutput, onRunStart]);

  useEffect(() => {
    if (autoRun && code && !hasRunRef.current) {
      hasRunRef.current = true;
      runCode();
    }
  }, [autoRun, code, runCode]);

  return (
    <div style={{ width: "100%" }}>
      <button
        className="btn btn-primary"
        onClick={runCode}
        disabled={isLoading}
        id="run-java-btn"
        style={{ width: "100%" }}
      >
        {isLoading
          ? statusMsg || "Java 엔진 처리 중..."
          : isReady
          ? "☕ Java 브라우저 샌드박스 재실행"
          : "☕ Java 브라우저 샌드박스 실행하기"}
      </button>
    </div>
  );
}
