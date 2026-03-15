import { NextRequest, NextResponse } from "next/server";
import {
  defaultSubscription,
  readStoredSubscription,
  saveSubscription,
  validateSubscription,
} from "@/lib/morning-love-mail";

export async function GET() {
  try {
    const subscription = await readStoredSubscription();

    return NextResponse.json({
      ok: true,
      subscription: subscription ?? defaultSubscription,
      hasSavedSubscription: Boolean(subscription),
    });
  } catch (error) {
    console.error("read subscription failed:", error);
    return NextResponse.json(
      { ok: false, error: "读取订阅失败，请稍后重试" },
      { status: 500 }
    );
  }
}

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

    await saveSubscription(validated.value);

    return NextResponse.json({ ok: true, subscription: validated.value });
  } catch (error) {
    console.error("save subscription failed:", error);
    return NextResponse.json(
      { ok: false, error: "保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
