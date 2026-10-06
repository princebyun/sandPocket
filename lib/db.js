/**
 * Database layer using sql.js (WebAssembly-based SQLite).
 * No native compilation required — works on any OS without build tools.
 * 
 * Data is persisted to disk at data/sandpocket.db
 */

import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DB_PATH = path.join(process.cwd(), "data", "sandpocket.db");

let db = null;
let initPromise = null;

/**
 * Initialize sql.js and load/create the database.
 */
async function getDb() {
  if (db) return db;

  // Prevent multiple parallel initializations
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Read WASM binary directly to avoid path resolution issues with Turbopack
    const possiblePaths = [
      path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
      path.join(process.cwd(), "public", "sql-wasm.wasm"),
    ];

    let wasmBinary = null;
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          wasmBinary = fs.readFileSync(p);
          break;
        }
      } catch { /* try next */ }
    }

    const initOptions = wasmBinary ? { wasmBinary } : {};
    const SQL = await initSqlJs(initOptions);

    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing DB or create new one
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        category TEXT NOT NULL CHECK(category IN ('game', 'website')),
        language TEXT NOT NULL CHECK(language IN ('python', 'java')),
        thumbnail_url TEXT,
        play_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'blocked', 'pending')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS code_files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        is_entry_point INTEGER DEFAULT 0,
        file_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
    `);

    // Insert anonymous user if not exists
    const existing = db.exec("SELECT id FROM users WHERE id = 'anonymous'");
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(
        "INSERT INTO users (id, username, email) VALUES (?, ?, ?)",
        ["anonymous", "anonymous", "anon@sandpocket.dev"]
      );
      await saveDb();
    }

    // Seed default working demo project: Playable Canvas Snake Game (Sample Board Post)
    const demoId = "demo-ai-snake-game";
    const demoFileId = "demo-ai-snake-file";
    const demoTitle = "[예시] 캔버스 뱀 게임 (Python 3.12)";
    const demoDesc = "AI 바이브코딩으로 구현된 브라우저 Canvas 뱀 게임 예시 프로젝트입니다. 방향키(↑↓←→)로 뱀을 조종하며 WebAssembly 샌드박스 실시간 구동을 체험해 보세요.";
    const demoCode = [
      "from js import document, window",
      "from pyodide.ffi import create_proxy",
      "import random",
      "",
      "try:",
      "    window.clearInterval(window._sg_iv)",
      "    document.removeEventListener('keydown', window._sg_kp)",
      "except Exception:",
      "    pass",
      "",
      "CELL = 24",
      "COLS = 20",
      "ROWS = 15",
      "W = CELL * COLS",
      "H = CELL * ROWS",
      "",
      "mount = document.getElementById('sandbox-game-mount')",
      "if mount is None:",
      "    mount = document.createElement('div')",
      "    mount.id = 'sandbox-game-mount'",
      "    b = document.querySelector('.player-main')",
      "    if b:",
      "        b.prepend(mount)",
      "",
      "mount.innerHTML = ''",
      "",
      "wrap = document.createElement('div')",
      "wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px;background:#fff;border-radius:14px;border:1px solid #ebeef2;box-shadow:0 4px 12px rgba(0,0,0,0.06);margin-bottom:16px;'",
      "",
      "hud = document.createElement('div')",
      "hud.style.cssText = 'font-size:1.3rem;font-weight:800;color:#191f28;'",
      "hud.textContent = 'Score: 0'",
      "wrap.appendChild(hud)",
      "",
      "canvas = document.createElement('canvas')",
      "canvas.width = W",
      "canvas.height = H",
      "canvas.style.cssText = 'border:2px solid #d8dadd;border-radius:10px;background:#fafbfc;display:block;max-width:100%;'",
      "wrap.appendChild(canvas)",
      "",
      "tip = document.createElement('div')",
      "tip.style.cssText = 'font-size:0.82rem;color:#8b95a1;'",
      "tip.textContent = 'Arrow Keys: Move | Space: Restart'",
      "wrap.appendChild(tip)",
      "mount.appendChild(wrap)",
      "",
      "ctx = canvas.getContext('2d')",
      "",
      "G = {",
      "    's': [(COLS // 2, ROWS // 2)],",
      "    'd': (1, 0),",
      "    'nd': (1, 0),",
      "    'f': (0, 0),",
      "    'sc': 0,",
      "    'ov': False,",
      "    'go': False,",
      "}",
      "",
      "def place_food():",
      "    occ = set(G['s'])",
      "    free = [(x, y) for x in range(COLS) for y in range(ROWS) if (x, y) not in occ]",
      "    G['f'] = random.choice(free) if free else (0, 0)",
      "",
      "place_food()",
      "PI2 = 6.2832",
      "",
      "def draw_rr(x, y, w, h, r):",
      "    ctx.beginPath()",
      "    ctx.moveTo(x + r, y)",
      "    ctx.lineTo(x + w - r, y)",
      "    ctx.quadraticCurveTo(x + w, y, x + w, y + r)",
      "    ctx.lineTo(x + w, y + h - r)",
      "    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)",
      "    ctx.lineTo(x + r, y + h)",
      "    ctx.quadraticCurveTo(x, y + h, x, y + h - r)",
      "    ctx.lineTo(x, y + r)",
      "    ctx.quadraticCurveTo(x, y, x + r, y)",
      "    ctx.closePath()",
      "    ctx.fill()",
      "",
      "def draw():",
      "    ctx.fillStyle = '#fafbfc'",
      "    ctx.fillRect(0, 0, W, H)",
      "    ctx.strokeStyle = '#eef0f3'",
      "    ctx.lineWidth = 0.5",
      "    for gx in range(0, W + 1, CELL):",
      "        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()",
      "    for gy in range(0, H + 1, CELL):",
      "        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke()",
      "    fx, fy = G['f']",
      "    ctx.fillStyle = 'rgba(225,29,72,0.15)'",
      "    ctx.beginPath()",
      "    ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2 + 2, CELL / 2 - 1, 0, PI2)",
      "    ctx.fill()",
      "    ctx.fillStyle = '#e11d48'",
      "    ctx.beginPath()",
      "    ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2, CELL / 2 - 3, 0, PI2)",
      "    ctx.fill()",
      "    n = len(G['s'])",
      "    for i in range(n - 1, -1, -1):",
      "        sx, sy = G['s'][i]",
      "        if i == 0:",
      "            ctx.fillStyle = '#03c75a'",
      "        else:",
      "            t = max(0.35, 1.0 - i * 0.03)",
      "            g = int(199 * t)",
      "            b = int(90 * t)",
      "            ctx.fillStyle = f'rgb(3,{g},{b})'",
      "        draw_rr(sx * CELL + 2, sy * CELL + 2, CELL - 4, CELL - 4, 5)",
      "    if G['s']:",
      "        hx2, hy2 = G['s'][0]",
      "        dx2, dy2 = G['d']",
      "        cx2 = hx2 * CELL + CELL / 2",
      "        cy2 = hy2 * CELL + CELL / 2",
      "        for sign in (1, -1):",
      "            ex = cx2 + dx2 * 4 + (-dy2) * 4 * sign",
      "            ey = cy2 + dy2 * 4 + dx2 * 4 * sign",
      "            ctx.fillStyle = '#fff'",
      "            ctx.beginPath(); ctx.arc(ex, ey, 3, 0, PI2); ctx.fill()",
      "            ctx.fillStyle = '#191f28'",
      "            ctx.beginPath(); ctx.arc(ex + dx2 * 1.5, ey + dy2 * 1.5, 1.5, 0, PI2); ctx.fill()",
      "    if G['ov']:",
      "        ctx.fillStyle = 'rgba(25,31,40,0.75)'",
      "        ctx.fillRect(0, 0, W, H)",
      "        ctx.textAlign = 'center'",
      "        ctx.textBaseline = 'middle'",
      "        ctx.fillStyle = '#fff'",
      "        ctx.font = 'bold 32px sans-serif'",
      "        ctx.fillText('GAME OVER', W / 2, H / 2 - 20)",
      "        ctx.font = '15px sans-serif'",
      "        ctx.fillStyle = '#b0b8c1'",
      "        ctx.fillText('Score: ' + str(G['sc']), W / 2, H / 2 + 12)",
      "        ctx.fillText('Press Space to restart', W / 2, H / 2 + 36)",
      "    elif not G['go']:",
      "        ctx.fillStyle = 'rgba(25,31,40,0.6)'",
      "        ctx.fillRect(0, 0, W, H)",
      "        ctx.textAlign = 'center'",
      "        ctx.textBaseline = 'middle'",
      "        ctx.fillStyle = '#03c75a'",
      "        ctx.font = 'bold 36px sans-serif'",
      "        ctx.fillText('SNAKE', W / 2, H / 2 - 28)",
      "        ctx.font = '15px sans-serif'",
      "        ctx.fillStyle = '#fff'",
      "        ctx.fillText('Press arrow key to start', W / 2, H / 2 + 8)",
      "        ctx.fillStyle = '#8b95a1'",
      "        ctx.font = '13px sans-serif'",
      "        ctx.fillText('Use arrow keys to move', W / 2, H / 2 + 32)",
      "",
      "def tick(*a):",
      "    if not G['go'] or G['ov']:",
      "        return",
      "    G['d'] = G['nd']",
      "    hx3, hy3 = G['s'][0]",
      "    dx3, dy3 = G['d']",
      "    nh = (hx3 + dx3, hy3 + dy3)",
      "    if nh[0] < 0 or nh[0] >= COLS or nh[1] < 0 or nh[1] >= ROWS or nh in G['s']:",
      "        G['ov'] = True",
      "        hud.textContent = 'Game Over! Score: ' + str(G['sc'])",
      "        draw()",
      "        return",
      "    G['s'].insert(0, nh)",
      "    if nh == G['f']:",
      "        G['sc'] += 10",
      "        place_food()",
      "    else:",
      "        G['s'].pop()",
      "    hud.textContent = 'Score: ' + str(G['sc']) + '  |  Length: ' + str(len(G['s']))",
      "    draw()",
      "",
      "def on_key(e):",
      "    k = e.key",
      "    if k == ' ':",
      "        if G['ov']:",
      "            G['s'] = [(COLS // 2, ROWS // 2)]",
      "            G['d'] = (1, 0)",
      "            G['nd'] = (1, 0)",
      "            G['sc'] = 0",
      "            G['ov'] = False",
      "            G['go'] = True",
      "            place_food()",
      "            hud.textContent = 'Score: 0'",
      "            draw()",
      "        e.preventDefault()",
      "        return",
      "    d = G['d']",
      "    moved = False",
      "    if k == 'ArrowUp' and d != (0, 1):",
      "        G['nd'] = (0, -1)",
      "        moved = True",
      "    elif k == 'ArrowDown' and d != (0, -1):",
      "        G['nd'] = (0, 1)",
      "        moved = True",
      "    elif k == 'ArrowLeft' and d != (1, 0):",
      "        G['nd'] = (-1, 0)",
      "        moved = True",
      "    elif k == 'ArrowRight' and d != (-1, 0):",
      "        G['nd'] = (1, 0)",
      "        moved = True",
      "    if moved:",
      "        if not G['go']:",
      "            G['go'] = True",
      "        e.preventDefault()",
      "",
      "kp = create_proxy(on_key)",
      "document.addEventListener('keydown', kp)",
      "window._sg_kp = kp",
      "",
      "tp = create_proxy(tick)",
      "iv = window.setInterval(tp, 130)",
      "window._sg_iv = iv",
      "",
      "draw()",
      "print('Snake game ready. Use arrow keys to play.')",
    ].join("\n");

    db.run(
      `INSERT OR REPLACE INTO projects (id, user_id, title, description, category, language, play_count, status)
       VALUES (?, 'anonymous', ?, ?, 'game', 'python', COALESCE((SELECT play_count FROM projects WHERE id = ?), 34), 'active')`,
      [demoId, demoTitle, demoDesc, demoId]
    );

    db.run(
      `INSERT OR REPLACE INTO code_files (id, project_id, filename, content, is_entry_point, file_order)
       VALUES (?, ?, 'main.py', ?, 1, 0)`,
      [demoFileId, demoId, demoCode]
    );

    // Seed default working Java demo project: CheerpJ WASM Demo (Sample Board Post)
    const javaDemoId = "demo-java-hello";
    const javaDemoFileId = "demo-java-file";
    const javaDemoTitle = "[예시] Java 알고리즘 계산기 (CheerpJ WASM)";
    const javaDemoDesc = "브라우저 내 JVM(CheerpJ)에서 javac 컴파일 및 사칙연산, 피보나치 수열을 실시간 계산하는 콘솔 알고리즘 예시 프로젝트입니다.";
    const javaDemoCode = `public class Main {
    public static void main(String[] args) {
        System.out.println("=========================================");
        System.out.println("☕ Java 8 (CheerpJ WebAssembly JVM) 데모");
        System.out.println("SandPocket 브라우저 내장 샌드박스 엔진");
        System.out.println("=========================================\\n");
        
        int a = 42, b = 13;
        System.out.println("--- [사칙연산 테스트] ---");
        System.out.println("42 + 13 = " + (a + b));
        System.out.println("42 - 13 = " + (a - b));
        System.out.println("42 * 13 = " + (a * b));
        System.out.println("42 / 13 = " + (a / b) + " (나머지: " + (a % b) + ")\\n");
        
        // 피보나치 수열 계산
        System.out.println("--- [피보나치 수열 (1~15번째)] ---");
        int prev = 0, curr = 1;
        for (int i = 1; i <= 15; i++) {
            System.out.print(curr + " ");
            int next = prev + curr;
            prev = curr;
            curr = next;
        }
        System.out.println("\\n\\n🎉 브라우저 내 100% 자율 컴파일 & JVM 구동 성공!");
    }
}`;

    db.run(
      `INSERT OR REPLACE INTO projects (id, user_id, title, description, category, language, play_count, status)
       VALUES (?, 'anonymous', ?, ?, 'website', 'java', COALESCE((SELECT play_count FROM projects WHERE id = ?), 15), 'active')`,
      [javaDemoId, javaDemoTitle, javaDemoDesc, javaDemoId]
    );

    // Update existing titles if they had old titles
    db.run("UPDATE projects SET title = ?, description = ? WHERE id = ?", [demoTitle, demoDesc, demoId]);
    db.run("UPDATE projects SET title = ?, description = ? WHERE id = ?", [javaDemoTitle, javaDemoDesc, javaDemoId]);

    db.run(
      `INSERT OR REPLACE INTO code_files (id, project_id, filename, content, is_entry_point, file_order)
       VALUES (?, ?, 'Main.java', ?, 1, 0)`,
      [javaDemoFileId, javaDemoId, javaDemoCode]
    );

    // Remove obsolete prototype/dummy snake games from previous test runs
    db.run("DELETE FROM code_files WHERE project_id IN (SELECT id FROM projects WHERE id != 'demo-ai-snake-game' AND id != 'demo-java-hello' AND (title LIKE '%뱀%' AND title NOT LIKE '%[예시]%'))");
    db.run("DELETE FROM projects WHERE id != 'demo-ai-snake-game' AND id != 'demo-java-hello' AND (title LIKE '%뱀%' AND title NOT LIKE '%[예시]%')");
    await saveDb();

    return db;
  })();


  db = await initPromise;
  initPromise = null;
  return db;
}

let writeQueue = Promise.resolve();

/**
 * Persist database to disk safely using a serialized Promise queue.
 * Prevents race conditions and database file corruption under concurrent writes.
 */
export async function saveDb() {
  if (!db) return;

  writeQueue = writeQueue.then(async () => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      const tempPath = `${DB_PATH}.tmp`;

      // Write to temp file first, then atomically rename
      await fs.promises.writeFile(tempPath, buffer);
      await fs.promises.rename(tempPath, DB_PATH);
    } catch (err) {
      // Direct write fallback in case of OS-level rename lock on Windows
      try {
        const data = db.export();
        await fs.promises.writeFile(DB_PATH, Buffer.from(data));
      } catch (writeErr) {
        console.error("[DB] Critical: Failed to persist database to disk:", writeErr);
      }
    }
  });

  return writeQueue;
}

/**
 * Helper: convert sql.js result to array of objects.
 */
function resultToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// ---- Project CRUD ----

export async function getAllProjects(category = null) {
  const db = await getDb();
  let query = `
    SELECT p.*, u.username as author
    FROM projects p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.status = 'active'
  `;

  if (category && category !== "all") {
    query += ` AND p.category = '${category.replace(/'/g, "''")}'`;
  }

  query += " ORDER BY p.created_at DESC";

  const result = db.exec(query);
  return resultToObjects(result);
}

export async function getProjectById(id) {
  const db = await getDb();

  const projectResult = db.exec(
    `SELECT p.*, u.username as author
     FROM projects p
     LEFT JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    [id]
  );
  const projects = resultToObjects(projectResult);
  if (projects.length === 0) return null;

  const codeResult = db.exec(
    `SELECT * FROM code_files WHERE project_id = ? ORDER BY file_order ASC`,
    [id]
  );
  const codeFiles = resultToObjects(codeResult);

  return { ...projects[0], code_files: codeFiles };
}

export async function createProject({ title, description, category, language, code, filename }) {
  const db = await getDb();
  const projectId = uuidv4();
  const codeFileId = uuidv4();
  const entryFilename = filename || (language === "python" ? "main.py" : "Main.java");

  db.run(
    `INSERT INTO projects (id, user_id, title, description, category, language)
     VALUES (?, 'anonymous', ?, ?, ?, ?)`,
    [projectId, title, description || "", category, language]
  );

  db.run(
    `INSERT INTO code_files (id, project_id, filename, content, is_entry_point, file_order)
     VALUES (?, ?, ?, ?, 1, 0)`,
    [codeFileId, projectId, entryFilename, code]
  );

  await saveDb();
  return { id: projectId };
}

export async function incrementPlayCount(id) {
  const db = await getDb();
  db.run("UPDATE projects SET play_count = play_count + 1 WHERE id = ?", [id]);
  await saveDb();
  const res = db.exec("SELECT play_count FROM projects WHERE id = ?", [id]);
  return (res[0] && res[0].values[0] && res[0].values[0][0]) || 0;
}

export async function getTopRankedProjects(category = null) {
  const db = await getDb();
  let query = `
    SELECT p.*, u.username as author
    FROM projects p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.status = 'active'
  `;

  if (category && category !== "all") {
    query += ` AND p.category = '${category.replace(/'/g, "''")}'`;
  }

  query += " ORDER BY p.play_count DESC, p.created_at DESC";

  const result = db.exec(query);
  return resultToObjects(result);
}

export async function getProjectCount() {
  const db = await getDb();
  const result = db.exec("SELECT COUNT(*) as count FROM projects WHERE status = 'active'");
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return 0;
}
