# SandPocket (샌드포켓)

**SandPocket**은 브라우저 환경에서 Java와 Python 코드를 즉시 작성하고 안전하게 실행해 볼 수 있는 **WebAssembly 기반의 무설치 샌드박스 플랫폼**입니다.

## ✨ 주요 기능 및 특징

- **초고속 브라우저 내장 런타임 (WebAssembly)**
  - **Java (CheerpJ)**: 브라우저 내에서 완전한 Java 8 JVM을 구동합니다. 자체 네이티브 고속 컴파일 API와 `os.tmpdir()` 기반의 최적화된 JAR 서빙 방식을 통해 무한 대기 현상이나 딜레이 없이 쾌적하게 실행됩니다.
  - **Python (Pyodide)**: 별도의 서버 인프라 없이 브라우저 단에서 즉시 Python 코드를 해석하고 실행합니다.
- **실시간 SAST 보안 검증**
  - 사용자가 작성한 코드를 실행하기 전에 금지된 시스템 패키지나 위험한 함수(os, sys, subprocess, java.io 등)가 포함되어 있는지 **정적 분석(AST 및 정규식)**을 통해 사전에 차단합니다.
- **모던하고 트렌디한 UI (Bento Grid)**
  - 일렉트릭 블루(`2B65FE`)와 딥 블랙(`#111111`) 색상을 기반으로 한 트렌디한 '벤토 그리드(Bento Grid)' 레이아웃을 채택하여, 직관적이고 세련된 사용자 경험을 제공합니다.
- **내장형 로컬 데이터베이스 (SQL.js)**
  - 별도의 외부 DB 설정 없이, WebAssembly 기반의 SQLite(`sql.js`)를 사용하여 프로젝트 목록, 실행 횟수, 유저 데이터 등을 로컬(`data/sandpocket.db`)에서 완벽하게 관리합니다.

## 🛠 기술 스택

- **Framework**: Next.js (App Router)
- **Styling**: Vanilla CSS (Global tokens & split-panel design)
- **Sandbox Engine**: CheerpJ (Java), Pyodide (Python)
- **Database**: SQL.js (WASM SQLite)

## 🚀 시작하기

### 설치 및 실행
```bash
# 의존성 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

접속 주소: `http://localhost:3000`

### 데이터베이스 관리
프로젝트 및 유저 데이터는 프로젝트 루트의 `data/sandpocket.db` 파일에 자동 생성 및 저장됩니다.

## 💡 프로젝트 구조
- `app/`: Next.js App Router 기반의 페이지 및 API 라우트 (`/api/compile`, `/api/validate` 등)
- `components/`: JavaRunner, PythonRunner, CodeEditor 등 공통 컴포넌트
- `lib/`: DB 연결(`db.js`), 코드 보안 검사기(`sast/`)
- `public/`: 정적 리소스 및 런타임 엔진 관련 에셋(`tools.jar`, `sql-wasm.wasm`)
