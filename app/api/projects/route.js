import { NextResponse } from "next/server";
import { getAllProjects, getTopRankedProjects, createProject } from "@/lib/db";
import { validateCode } from "@/lib/validators/index";

/**
 * GET /api/projects
 * List all projects, optionally filtered by category or sorted by ranking.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const sort = searchParams.get("sort") || "latest";

    const projects = sort === "ranking" 
      ? await getTopRankedProjects(category)
      : await getAllProjects(category);

    return NextResponse.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("[API] GET /api/projects error:", error);
    return NextResponse.json(
      { success: false, error: "프로젝트 목록을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project after SAST validation.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, category, language, code } = body;

    // Input validation
    if (!title || !category || !language || !code) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 항목을 모두 입력해 주세요 (제목, 카테고리, 언어, 코드).",
        },
        { status: 400 }
      );
    }

    if (!["game", "website"].includes(category)) {
      return NextResponse.json(
        { success: false, error: "카테고리는 'game' 또는 'website'만 가능합니다." },
        { status: 400 }
      );
    }

    if (!["python", "java"].includes(language)) {
      return NextResponse.json(
        { success: false, error: "언어는 'python' 또는 'java'만 가능합니다." },
        { status: 400 }
      );
    }

    // ---- SAST Security Validation ----
    const validation = await validateCode(code, language);

    if (!validation.safe) {
      return NextResponse.json(
        {
          success: false,
          error: "⚠️ 보안 검사에서 위험한 코드가 감지되었습니다.",
          violations: validation.violations,
        },
        { status: 400 }
      );
    }

    // ---- Save to DB ----
    const result = await createProject({
      title: title.slice(0, 100),
      description: (description || "").slice(0, 500),
      category,
      language,
      code,
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: result.id },
        message: "프로젝트가 성공적으로 등록되었습니다!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/projects error:", error);
    return NextResponse.json(
      { success: false, error: "프로젝트 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
