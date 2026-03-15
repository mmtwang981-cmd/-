import { NextResponse } from "next/server";
import { readActivityLog } from "@/lib/morning-love-mail";

export async function GET() {
  try {
    const activity = await readActivityLog();

    return NextResponse.json({
      ok: true,
      generationLogs: activity.generationLogs,
      sendLogs: activity.sendLogs,
    });
  } catch (error) {
    console.error("read activity failed:", error);
    return NextResponse.json(
      { ok: false, error: "读取活动记录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
