# SandPocket 프로젝트 종합 리팩토링 & 로보토리 스타일 디자인 개편 작업계획서

**문서 버전:** 2.0.0 (디자인 레퍼런스 반영본)  
**작성일:** 2026-10-06  
**레퍼런스 사이트:** [로보토리 (Robotori)](https://robotori.co.kr/v2/index/html/main/intro.html)  
**대상 시스템:** SandPocket (WASM 기반 안전한 코드 샌드박스 & 에듀테크 플랫폼)

---

## 1. 개요 및 목적

본 계획서는 SandPocket 플랫폼의 **시스템 안정성 확보(DB 동기 I/O 해결, SAST 서버 동결 방지, 클라이언트 무한루프 격리)**와 더불어, **로보토리(Robotori) 공식 웹사이트의 감각적인 디자인 시스템을 이식**하여 기존의 AI 템플릿 느낌을 완전히 탈피하고 독창적이며 완성도 높은 에듀테크/코딩 플랫폼으로 환골탈태하는 것을 목표로 합니다.

---

## 2. 로보토리(Robotori) 디자인 레퍼런스 심층 분석

로보토리 웹사이트(`intro.html` 및 메인 `style.css`)의 디자인 언어를 분석한 핵심 요소는 다음과 같습니다:

| 디자인 요소 | 로보토리(Robotori) 특징 | SandPocket 적용 방안 |
| :--- | :--- | :--- |
| **레이아웃 구조** | 좌/우 50:50 대담한 **스플릿(Split) 인트로**, 비대칭 2x2 **벤토 그리드(Bento Grid)** | **메인 히어로:** Python 게임 vs Java 알고리즘을 좌우 대칭으로 직관 분할<br>**프로젝트 목록:** 30px 라운드 벤토 그리드로 재배치 |
| **타이포그래피** | 대담하고 기하학적인 헤드라인 폰트 (`Gmarket Sans` 60~90px Bold) + 깔끔한 고딕 | 볼드하고 시원한 **Gmarket Sans / Plus Jakarta Sans** 도입, 큼직한 한글/영문 대비 |
| **컬러 시스템** | **Electric Royal Blue (`#2B65FE`, `#407FF0`, `#5492FF`)** + 딥 블랙 (`#111`) + 소프트 그레이 (`#F8F8F9`) | 기존의 밋밋한 초록/파랑을 버리고, **선명한 로보토리 일렉트릭 블루와 모던 블랙/화이트**를 메인 키 컬러로 확정 |
| **버튼 & 쉐이프** | **30px~42px 라운드 곡선**, 완전 타원형 캡슐 알약 버튼(`border-radius: 42px`), 원형 배지 | 박스형 버튼 전면 제거 ➔ **알약형 캡슐 버튼** 및 부드러운 슈퍼엘립스(Super-ellipse) 카드 적용 |
| **마이크로 인터랙션** | 호버 시 이미지 스케일 확대(`scale(1.2)`), **우측 하단 원형 아이콘 리빌(`.circle-icon` translate/fade-in)** | 프로젝트 카드 호버 시 **부드러운 확대 + 플레이 원형 버튼(`Circle Arrow`) 부유 애니메이션** 구현 |

---

## 3. 현황 분석 및 고위험 결함 요인 (기술 부채)

### [위험도: 높음 🔴] 1. 서버 동기 I/O 및 데이터 무결성 훼손 (`lib/db.js`)
* **현상:** `sql.js` 파일 읽기/쓰기가 `fs.readFileSync`와 `fs.writeFileSync`로 동기 실행됨.
* **위험:** 동시 다중 요청 시 Node.js 이벤트 루프가 정지되고, 파일 덮어쓰기 Race Condition으로 `sandpocket.db` 파손 위험.

### [위험도: 높음 🔴] 2. SAST 검증 시 서버 동결 위험 (`lib/validators/pythonValidator.js`)
* **현상:** `execSync("python ...")` 동기 프로세스 실행 (최대 20초 블로킹).
* **위험:** 비정상 요청이나 Windows 파이썬 경로 지연 시 서버 전체가 먹통 상태에 빠짐.

### [위험도: 높음 🔴] 3. 브라우저 메인 스레드 블로킹 & 탭 크래시 (`PythonRunner.js`, `JavaRunner.js`)
* **현상:** 브라우저 UI 스레드에서 직접 Pyodide 및 CheerpJ 코드를 실행함.
* **위험:** `while True:` 등 무한루프 코드 실행 시 브라우저 탭 전체가 정지(Freeze)되어 강제 종료 외에 복구 불가능.

---

## 4. 종합 작업 로드맵 (Action Plan)

### Phase 1: 백엔드 및 데이터 계층 안정화
- **작업 1.1 (`lib/db.js` 비동기화 및 Safe Write Queue):**
  - `fs/promises` 기반 비동기 I/O 전환.
  - 비동기 쓰기 큐(Promise Queue)를 도입하여 동시 쓰기 요청 시 파일 손상을 100% 방지.
- **작업 1.2 (`lib/validators/pythonValidator.js` 비동기 처리):**
  - `execSync` ➔ 비동기 `child_process.exec` 전환 및 3초 엄격 타임아웃 적용.
  - 지연 발생 시 초고속 정규식 Fallback으로 끊김 없는 서비스 보장.
- **작업 1.3 (`app/api` 규격화):**
  - 입력값 검증, 안전한 매개변수화 쿼리 및 통일된 응답 포맷 구성.

### Phase 2: 클라이언트 샌드박스 격리 & 킬 스위치
- **작업 2.1 (Python Runner Web Worker 격리):**
  - Pyodide 엔진을 Web Worker 스레드로 이전하여 UI 메인 스레드 분리.
  - 5초 초과 시 자동 중단(Timeout) 및 사용자가 즉시 멈출 수 있는 [강제 종료(Kill)] 스위치 제공.
- **작업 2.2 (Java Runner 안정화):**
  - CheerpJ 콘솔 가로채기(Log Intercept) 누수 해결 및 안전한 초기화 가드 작성.
- **작업 2.3 (Canvas 렌더링 컨테이너 캡슐화):**
  - React 라이프사이클에 안전하게 마운트/언마운트되는 캔버스 래퍼 구조 구축.

### Phase 3: 로보토리 디자인 시스템(Design Tokens) 구축
- **작업 3.1 (`app/globals.css` 전면 재작성):**
  - **Color Palette:**
    - Primary: `#2B65FE` (로보토리 시그니처 로열 블루)
    - Primary Light: `#5492FF`
    - Deep Charcoal: `#111111`
    - Pure Canvas: `#FFFFFF`
    - Soft Surface: `#F8F8F9`
    - Border / Divider: `#EBEBEB`
  - **Typography:**
    - Header/Display: `Gmarket Sans` (CDN 연동, 초특급 볼드 영문/한글)
    - Body/UI: `Pretendard` / `Noto Sans KR`
    - Code: `JetBrains Mono`
  - **Components Token:**
    - Cards: `border-radius: 30px` & 부드러운 그림자(`box-shadow: 0 15px 40px rgba(0,0,0,0.06)`)
    - Buttons: 캡슐형(`border-radius: 42px`), 화살표 인터랙션
    - Animations: `.circle-icon` 호버 리빌 모션

### Phase 4: 페이지별 로보토리 스타일 전면 리뉴얼
- **작업 4.1 (헤더 `Header.js`):**
  - 로보토리 스타일의 100px 쾌적한 헤더 + 라운드 GNB 버튼(`border-radius: 20px; background: #111`) + 세련된 로고.
- **작업 4.2 (메인 페이지 `app/page.js`):**
  - **스플릿 히어로 섹션 (로보토리 `intro.html` 이식):**
    - 좌측: 🕹️ **Python 게임 샌드박스** (로열 블루 배경, 거대한 Gmarket Sans 텍스트, 캡슐 바로가기)
    - 우측: ☕ **Java & 웹 애플리케이션** (딥 블랙 배경, 에듀/알고리즘 텍스트, 캡슐 바로가기)
  - **로보토리 벤토 그리드 프로젝트 리스트:**
    - 대형 대표 카드(좌) + 2x2 미니 카드(우) 레이아웃 (`.sec02-info01` 구조 차용).
    - 카드 호버 시 우측 하단에서 원형 화살표 아이콘이 떠오르는 리빌 효과.
- **작업 4.3 (프로젝트 실행 페이지 `app/project/[id]/page.js`):**
  - 로보토리의 정돈된 화이트 & 30px 라운드 프레임 안에 모던 다크 에디터와 캔버스 뷰어를 배치하여 시각적 완성도 극대화.
- **작업 4.4 (에디터 & 콘솔 컴포넌트 `CodeEditor.js`):**
  - 라인 넘버 표시 및 스마트 탭 들여쓰기, 깔끔한 툴바 지원.
- **작업 4.5 (업로드 & 랭킹 페이지):**
  - 30px 라운드 폼 카드와 알약형 카테고리 셀렉터 적용.

### Phase 5: 통합 테스트 & 반응형 검증
- **테스트 5.1:** 모바일(360px~), 태블릿(768px~), 데스크톱(1200px~) 반응형 스플릿 레이아웃 점검.
- **테스트 5.2:** `while True:` 무한루프 코드 주입 시 UI 프리징 없이 워커가 안전 차단되는지 확인.
- **테스트 5.3:** 동시 다중 프로젝트 등록 시 DB 손상 없이 큐가 순차 처리되는지 검증.

---

## 5. 수정 대상 파일 및 작업 산출물 매핑

| 파일 경로 | 수정 내용 |
| :--- | :--- |
| `lib/db.js` | 비동기 I/O 전환 및 디스크 쓰기 직렬화 큐(Write Queue) 구축 |
| `lib/validators/pythonValidator.js` | `execSync` 블로킹 제거 및 비동기 프로세스 처리 |
| `components/PythonRunner.js` | Web Worker 격리 및 무한루프 방지 5초 타임아웃 킬 스위치 |
| `components/JavaRunner.js` | CheerpJ 출력 가로채기 메모리 누수 방지 및 런타임 제어 |
| `components/CodeEditor.js` | 라인 번호, 탭 처리, 프로급 에디터 인터페이스 |
| `app/globals.css` | **로보토리 테마 시스템 전면 구축** (Gmarket Sans, #2B65FE, 30px 라운드, 캡슐 버튼, 서클 리빌 모션) |
| `components/Header.js` | 로보토리 GNB 레이아웃 및 캡슐 버튼 적용 |
| `components/ProjectCard.js` | 30px 라운드 벤토 카드 및 호버 시 원형 아이콘 리빌 모션 적용 |
| `app/page.js` | 로보토리 `intro.html` 기반의 스플릿 히어로 + 대담한 프로젝트 벤토 그리드 |
| `app/project/[id]/page.js` | 모던 플레이그라운드 2-패널 레이아웃 적용 |
| `app/upload/page.js`, `app/ranking/page.js` | 로보토리 테크 에듀 대시보드 스타일로 개편 |
