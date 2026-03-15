"use client";

import { useEffect, useState } from "react";

type Subscription = {
  recipientEmail: string;
  city: string;
  sendTime: string;
  tone: string;
  wifePersona: string;
  userPersona: string;
  constraints: string;
};

type PreviewState = {
  loveLine: string;
  city: string;
  weather: string;
  tag: string;
  newsSummary: string[];
};

type SendLogEntry = {
  id: string;
  trigger: "manual" | "scheduled";
  sentAt: string;
  recipientEmail: string;
  city: string;
  subject: string;
  weather: string;
  loveLine: string;
  simulated: boolean;
  ok: boolean;
  provider?: string;
  providerMessage?: string;
};

type GenerationLogEntry = {
  id: string;
  trigger: "preview" | "manual" | "scheduled";
  generatedAt: string;
  city: string;
  tone: string;
  weather: string;
  newsSummary: string[];
  loveLine: string;
  recipientEmail: string;
  generationMode: "openai" | "fallback";
};

const defaultForm: Subscription = {
  recipientEmail: "",
  sendTime: "07:30",
  city: "上海",
  tone: "温柔聪明",
  wifePersona:
    "LVMH 和 Tiffany 从业者，做过珠宝创业，有艺术背景，对审美、材质、细节和品牌叙事敏感。",
  userPersona:
    "智能驾驶产品经理，关心技术趋势、产品判断与复杂系统，表达理性但希望保留温度。",
  constraints:
    "结合天气与重点新闻的情绪，但不要直接照搬标题；像真实伴侣会说的话；不油腻，不像营销文案，结尾带一点生活关心。",
};

const defaultPreview: PreviewState = {
  loveLine:
    "今天上海是多云，14~21°C，早晚稍凉，世界照旧忙碌，但我还是想先把一点安稳留给你，愿你今天从清晨开始就有被照顾的感觉，记得吃早餐，也别让自己着凉。",
  city: "上海",
  weather: "多云，14~21°C，早晚稍凉",
  tag: "温柔聪明 · 克制温柔",
  newsSummary: [
    "今天值得被记住的，不一定是最大的标题，而是世界情绪里那一点细微转向。",
    "上海的城市节奏不算急，适合把清晨留给更柔和的表达。",
    "关于 AI 与产品判断的讨论还在升温，但好的体验最终总会回到人身上。",
  ],
};

const highlightSignals = [
  "天气已经改成服务端实时拉取，预览和发信共用同一套数据源。",
  "新闻线索会优先走真实新闻源，失败时才会退回安全兜底文案。",
  "现在可以直接手动测试发信，不需要再卡着 cron 时间窗口验收。",
];

export default function Page() {
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Subscription>(defaultForm);
  const [preview, setPreview] = useState<PreviewState>(defaultPreview);
  const [sendLogs, setSendLogs] = useState<SendLogEntry[]>([]);
  const [generationLogs, setGenerationLogs] = useState<GenerationLogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      try {
        const [subscriptionRes, activityRes] = await Promise.all([
          fetch("/api/subscribe"),
          fetch("/api/activity"),
        ]);
        const subscriptionData = (await subscriptionRes.json()) as {
          ok?: boolean;
          subscription?: Subscription;
        };
        const activityData = (await activityRes.json()) as {
          ok?: boolean;
          sendLogs?: SendLogEntry[];
          generationLogs?: GenerationLogEntry[];
        };

        if (!cancelled) {
          if (subscriptionRes.ok && subscriptionData.ok && subscriptionData.subscription) {
            setForm(subscriptionData.subscription);
          }

          if (activityRes.ok && activityData.ok) {
            setSendLogs(activityData.sendLogs ?? []);
            setGenerationLogs(activityData.generationLogs ?? []);
          }
        }
      } catch (error) {
        console.error("load page data failed:", error);
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateForm(key: keyof Subscription, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave() {
    try {
      setStatusMessage(null);
      setSaving(true);

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setStatusMessage(data?.error || "保存失败，请稍后重试");
        return;
      }

      setStatusMessage("订阅已保存，系统会按你设置的时间自动发送。");
    } catch (error) {
      console.error("save failed:", error);
      setStatusMessage("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    try {
      setStatusMessage(null);
      setLoading(true);

      const res = await fetch("/api/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as
        | ({ ok: true } & PreviewState)
        | { ok?: false; error?: string };

      if (!res.ok || !("loveLine" in data)) {
        throw new Error("error" in data ? data.error : "预览生成失败");
      }

      setPreview({
        loveLine: data.loveLine,
        city: data.city,
        weather: data.weather,
        tag: data.tag,
        newsSummary: data.newsSummary,
      });
      await refreshActivity();
      setStatusMessage("预览已更新，当前内容基于实时天气和新闻线索。");
    } catch (error) {
      console.error("preview failed:", error);
      setStatusMessage("预览生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTest() {
    try {
      setStatusMessage(null);
      setSendingTest(true);

      const res = await fetch("/api/send-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as
        | {
            ok: true;
            simulated: boolean;
            sentTo: string;
            loveLine: string;
            city?: string;
            weather: string;
            newsSummary: string[];
          }
        | { ok?: false; error?: string; providerError?: { message?: string } };

      if (!res.ok || !data.ok) {
        const message =
          ("providerError" in data && data.providerError?.message) ||
          ("error" in data && data.error) ||
          "测试发信失败，请稍后重试";
        setStatusMessage(message);
        return;
      }

      setStatusMessage(
        data.simulated
          ? `测试链路已跑通，当前是模拟发送，目标邮箱 ${data.sentTo}。`
          : `测试邮件已发送到 ${data.sentTo}。`
      );
      setPreview((prev) => ({
        ...prev,
        weather: data.weather,
        newsSummary: data.newsSummary,
        loveLine: data.loveLine,
      }));
      await refreshActivity();
    } catch (error) {
      console.error("manual send failed:", error);
      setStatusMessage("测试发信失败，请稍后重试");
    } finally {
      setSendingTest(false);
    }
  }

  async function refreshActivity() {
    try {
      const res = await fetch("/api/activity");
      const data = (await res.json()) as {
        ok?: boolean;
        sendLogs?: SendLogEntry[];
        generationLogs?: GenerationLogEntry[];
      };

      if (res.ok && data.ok) {
        setSendLogs(data.sendLogs ?? []);
        setGenerationLogs(data.generationLogs ?? []);
      }
    } catch (error) {
      console.error("refresh activity failed:", error);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6ef_0%,#fcfaf7_42%,#f4efe8_100%)] text-stone-900">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-10">
        <header className="mb-10 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-stone-200/80 bg-white/80 px-4 py-1.5 text-sm text-stone-600 shadow-sm backdrop-blur">
              Morning Love Mail · 天气 · 新闻 · 人物语气
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              每天早晨，替你发出一句
              <span className="block bg-gradient-to-r from-rose-500 via-amber-500 to-stone-900 bg-clip-text text-transparent">
                更像你，也更懂她的话
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              先理解今天的天气和新闻情绪，再结合她的审美背景、你的表达方式，生成一封自然、节制、有体温的晨间爱意。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-stone-200/80 bg-white/80 p-4 shadow-xl shadow-stone-200/40 backdrop-blur sm:grid-cols-4 lg:w-[460px]">
            {[
              ["城市", form.city],
              ["发送时间", form.sendTime],
              ["风格", form.tone],
              ["送达方式", "Email"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-stone-50 p-3">
                <div className="text-xs text-stone-500">{label}</div>
                <div className="mt-1 text-sm font-medium text-stone-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-stone-200/80 bg-white/88 p-6 shadow-2xl shadow-stone-200/50 backdrop-blur sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900">
                  创建晨间订阅
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  只保留 MVP 真正必要的信息，让配置足够完整，也足够轻。
                </p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                Single-user MVP
              </div>
            </div>

            <form className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">
                    收件邮箱
                  </span>
                  <input
                    type="email"
                    placeholder="wife@example.com"
                    value={form.recipientEmail}
                    onChange={(e) => updateForm("recipientEmail", e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">
                    发送时间
                  </span>
                  <input
                    type="time"
                    value={form.sendTime}
                    onChange={(e) => updateForm("sendTime", e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">
                    城市
                  </span>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">
                    表达风格
                  </span>
                  <select
                    value={form.tone}
                    onChange={(e) => updateForm("tone", e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-400 focus:bg-white"
                  >
                    <option>温柔聪明</option>
                    <option>克制高级</option>
                    <option>俏皮亲密</option>
                    <option>文艺安抚</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  她的人物背景
                </span>
                <textarea
                  rows={4}
                  value={form.wifePersona}
                  onChange={(e) => updateForm("wifePersona", e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-stone-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  你的人物背景
                </span>
                <textarea
                  rows={4}
                  value={form.userPersona}
                  onChange={(e) => updateForm("userPersona", e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-stone-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  情话约束
                </span>
                <textarea
                  rows={3}
                  value={form.constraints}
                  onChange={(e) => updateForm("constraints", e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-stone-400 focus:bg-white"
                />
              </label>

              <div className="grid gap-4 rounded-3xl border border-dashed border-stone-200 bg-stone-50/80 p-5 sm:grid-cols-3">
                {highlightSignals.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-stone-600 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || booting}
                  className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "保存中..." : "保存订阅"}
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading || booting}
                  className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "生成中..." : "测试生成"}
                </button>
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest || booting}
                  className="inline-flex items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingTest ? "发送中..." : "立即测试发信"}
                </button>
              </div>

              <p className="pt-1 text-xs text-stone-500">
                {booting
                  ? "正在读取已保存的订阅配置..."
                  : statusMessage ||
                    "保存后会用于定时发送；测试发信会直接调用 Resend，不受当前时间限制。"}
              </p>
            </form>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-stone-200 bg-stone-900 p-6 text-white shadow-2xl shadow-stone-300/30 sm:p-8">
              <div className="text-sm tracking-[0.2em] text-stone-300">
                今日示例情话
              </div>
              <p className="mt-4 text-lg leading-8 text-stone-100 sm:text-xl">
                {preview.loveLine}
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-stone-300">
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {preview.city}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {preview.weather}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {preview.tag}
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/40">
              <h3 className="text-lg font-semibold text-stone-900">
                今日信号
              </h3>
              <div className="mt-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
                {preview.weather}
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
                {preview.newsSummary.map((item) => (
                  <li key={item} className="rounded-2xl bg-stone-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/40">
              <h3 className="text-lg font-semibold text-stone-900">
                最近 30 次发送记录
              </h3>
              <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {sendLogs.length === 0 ? (
                  <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
                    还没有发送记录。
                  </div>
                ) : (
                  sendLogs.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-stone-900">
                          {item.ok ? "发送成功" : "发送失败"} ·{" "}
                          {item.trigger === "manual" ? "手动" : "定时"}
                        </span>
                        <span className="text-xs text-stone-500">
                          {formatDateTime(item.sentAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-stone-500">
                        {item.recipientEmail} · {item.city}
                      </div>
                      <div className="mt-2 text-sm text-stone-700">
                        {item.subject}
                      </div>
                      <div className="mt-1 text-xs text-stone-500">
                        {item.weather}
                      </div>
                      {item.providerMessage ? (
                        <div className="mt-1 text-xs text-rose-600">
                          {item.providerMessage}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/40">
              <h3 className="text-lg font-semibold text-stone-900">
                最近 30 次生成内容
              </h3>
              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {generationLogs.length === 0 ? (
                  <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
                    还没有生成记录。
                  </div>
                ) : (
                  generationLogs.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-stone-900">
                          {item.trigger === "preview"
                            ? "预览生成"
                            : item.trigger === "manual"
                              ? "手动发信生成"
                              : "定时发信生成"}{" "}
                          · {item.generationMode === "openai" ? "AI" : "Fallback"}
                        </span>
                        <span className="text-xs text-stone-500">
                          {formatDateTime(item.generatedAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-stone-500">
                        {item.recipientEmail} · {item.city} · {item.tone}
                      </div>
                      <div className="mt-2 text-sm text-stone-700">
                        {item.loveLine}
                      </div>
                      <div className="mt-2 text-xs text-stone-500">
                        {item.weather}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.newsSummary.map((news) => (
                          <span
                            key={`${item.id}-${news}`}
                            className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500"
                          >
                            {news}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/40">
              <h3 className="text-lg font-semibold text-stone-900">
                产品取舍
              </h3>
              <ul className="mt-4 space-y-4 text-sm leading-6 text-stone-600">
                <li>
                  <span className="font-medium text-stone-900">Focus：</span>
                  不做复杂用户系统，不做多角色社交，第一版只把“每天一封值得发送的晨间邮件”做好。
                </li>
                <li>
                  <span className="font-medium text-stone-900">End-to-end：</span>
                  从配置、生成、存储到投递打通，不让产品停留在一页 demo 上。
                </li>
                <li>
                  <span className="font-medium text-stone-900">Taste：</span>
                  天气和新闻不是信息堆砌，而是被转译成一句更像伴侣会说的话。
                </li>
              </ul>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
