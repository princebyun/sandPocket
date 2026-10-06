import { NextResponse } from "next/server";
import { validateCode } from "@/lib/validators/index";

/**
 * POST /api/validate
 * Standalone SAST validation endpoint for real-time checking.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, language } = body;

    if (!code || !language) {
      return NextResponse.json(
        { success: false, error: "코드와 언어를 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!["python", "java"].includes(language)) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 언어입니다. (python 또는 java)" },
        { status: 400 }
      );
    }

    const result = await validateCode(code, language);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] POST /api/validate error:", error);
    return NextResponse.json(
      { success: false, error: "보안 검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
