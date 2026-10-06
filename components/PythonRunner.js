"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function PythonRunner({ code, onOutput, autoRun = false, onRunStart }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const pyodideRef = useRef(null);
  const hasRun = useRef(false);

  // Global cleanup for canvas games / lingering timers
  const stopExecution = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window._sg_iv) {
        window.clearInterval(window._sg_iv);
        window._sg_iv = null;
      }
      if (window._sg_kp) {
        document.removeEventListener("keydown", window._sg_kp);
        window._sg_kp = null;
      }
    }
    setIsRunning(false);
    onOutput?.({ type: "system", text: "⏹️ [System] 사용자에 의해 실행 및 타이머 루프가 안전하게 중단되었습니다." });
  }, [onOutput]);

  const loadPyodide = useCallback(async () => {
    if (pyodideRef.current) {
      setIsReady(true);
      return pyodideRef.current;
    }

    setIsLoading(true);
    onOutput?.({ type: "system", text: "[System] Python 런타임(Pyodide WASM v0.27) 엔진을 준비 중입니다..." });

    try {
      if (!window.loadPyodide) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error("Pyodide CDN 스크립트 다운로드에 실패했습니다."));
          document.head.appendChild(script);
        });
      }

      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
      });

      pyodideRef.current = pyodide;
      setIsReady(true);
      setIsLoading(false);
      onOutput?.({ type: "system", text: "[System] WebAssembly 격리 샌드박스 준비 완료. 코드를 실행합니다." });
      return pyodide;
    } catch (err) {
      setIsLoading(false);
      onOutput?.({
        type: "stderr",
        text: `[Error] Pyodide 로딩 실패: ${err.message}`,
      });
      return null;
    }
  }, [onOutput]);

  const runCode = useCallback(async () => {
    // 1. Clean up any previous timers/canvas instances
    if (typeof window !== "undefined") {
      if (window._sg_iv) {
        window.clearInterval(window._sg_iv);
        window._sg_iv = null;
      }
      if (window._sg_kp) {
        document.removeEventListener("keydown", window._sg_kp);
        window._sg_kp = null;
      }
    }

    onRunStart?.();
    const pyodide = await loadPyodide();
    if (!pyodide) return;

    setIsRunning(true);
    onOutput?.({ type: "system", text: "\n--- Python 실행 시작 ---" });

    try {
      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);

      // Execute with async timeout watchdog protection
      let isCompleted = false;
      const executionPromise = pyodide.runPythonAsync(code);
      
      // 15 second watchdog timer for infinite loop safety
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          if (!isCompleted) {
            reject(new Error("실행 시간 초과 (15초). 무한 루프 또는 장시간 블로킹이 감지되어 실행을 보호 조치했습니다."));
          }
        }, 15000)
      );

      await Promise.race([
        executionPromise.then((res) => {
          isCompleted = true;
          return res;
        }),
        timeoutPromise,
      ]);

      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");

      if (stdout) {
        onOutput?.({ type: "stdout", text: stdout });
      }
      if (stderr) {
        onOutput?.({ type: "stderr", text: stderr });
      }
      if (!stdout && !stderr) {
        onOutput?.({ type: "system", text: "(실행 완료: 콘솔 출력 데이터 없음)" });
      }

      onOutput?.({ type: "system", text: "--- Python 실행 종료 ---\n" });
    } catch (err) {
      onOutput?.({
        type: "stderr",
        text: `[Runtime Error]\n${err.message}`,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, loadPyodide, onOutput, onRunStart]);

  useEffect(() => {
    if (autoRun && code && !hasRun.current) {
      hasRun.current = true;
      runCode();
    }
    return () => {
      // Cleanup on unmount
      if (typeof window !== "undefined" && window._sg_iv) {
        window.clearInterval(window._sg_iv);
      }
    };
  }, [autoRun, code, runCode]);

  return (
    <div style={{ display: "flex", gap: "10px", width: "100%" }}>
      <button
        className="btn btn-primary"
        onClick={runCode}
        disabled={isLoading || isRunning}
        id="run-python-btn"
        style={{ flex: 1 }}
      >
        {isLoading
          ? "WASM 엔진 준비 중..."
          : isRunning
          ? "코드 실행 중..."
          : isReady
          ? "▶ Python 샌드박스 재실행"
          : "▶ Python 샌드박스 실행하기"}
      </button>

      {(isRunning || (typeof window !== "undefined" && window._sg_iv)) && (
        <button
          className="btn btn-danger"
          onClick={stopExecution}
          id="stop-python-btn"
          title="실행 중인 게임 루프 또는 프로세스를 즉시 강제 중단합니다."
        >
          ⏹️ 정지
        </button>
      )}
    </div>
  );
}
