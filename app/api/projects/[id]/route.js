import { NextResponse } from "next/server";
import { getProjectById, incrementPlayCount } from "@/lib/db";

/**
 * GET /api/projects/[id]
 * Get a single project with its code files.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("[API] GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "프로젝트 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]
 * Increment play count when the user clicks the Run / Execution button.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const newPlayCount = await incrementPlayCount(id);

    return NextResponse.json({
      success: true,
      playCount: newPlayCount,
    });
  } catch (error) {
    console.error("[API] POST /api/projects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "실행 카운트 집계 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
