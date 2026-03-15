import { NextRequest, NextResponse } from "next/server";
import {
  buildLoveLineContext,
  defaultSubscription,
  validateSubscription,
} from "@/lib/morning-love-mail";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<typeof defaultSubscription>;
    const validated = validateSubscription({
      ...defaultSubscription,
      ...body,
      recipientEmail: body.recipientEmail?.trim() || "preview@example.com",
    });

    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      );
    }

    const context = await buildLoveLineContext(validated.value);

    return NextResponse.json({
      ok: true,
      city: context.city,
      weather: context.weather,
      tag: context.tag,
      newsSummary: context.newsSummary,
      loveLine: context.loveLine,
    });
  } catch (error) {
    console.error("preview generation failed:", error);
    return NextResponse.json(
      { ok: false, error: "预览生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
