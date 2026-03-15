import { NextRequest, NextResponse } from "next/server";
import {
  canSendScheduledLoveMail,
  markScheduledSend,
  readStoredSubscription,
  sendLoveMail,
} from "@/lib/morning-love-mail";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    const isProd = process.env.NODE_ENV === "production";

    if (isProd && authHeader !== expected) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subscription = await readStoredSubscription();

    if (!subscription) {
      return NextResponse.json(
        { ok: false, error: "No saved subscription found" },
        { status: 404 }
      );
    }

    const sendCheck = await canSendScheduledLoveMail(subscription.sendTime);

    if (!sendCheck.shouldSend) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: sendCheck.reason,
        sendTime: subscription.sendTime,
      });
    }

    const result = await sendLoveMail(subscription, "scheduled");

    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.providerError?.statusCode ?? 502,
      });
    }

    await markScheduledSend();

    return NextResponse.json(result);
  } catch (error) {
    console.error("cron send failed:", error);
    return NextResponse.json(
      { ok: false, error: "Send failed" },
      { status: 500 }
    );
  }
}
