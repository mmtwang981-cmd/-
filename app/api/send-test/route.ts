import { NextRequest, NextResponse } from "next/server";
import {
  defaultSubscription,
  sendLoveMail,
  validateSubscription,
} from "@/lib/morning-love-mail";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<typeof defaultSubscription>;
    const validated = validateSubscription(body);

    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      );
    }

    const result = await sendLoveMail(validated.value, "manual");

    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.providerError?.statusCode ?? 502,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("manual send failed:", error);
    return NextResponse.json(
      { ok: false, error: "测试发信失败，请稍后重试" },
      { status: 500 }
    );
  }
}
