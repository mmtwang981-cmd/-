import fs from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import OpenAI from "openai";
import { Resend } from "resend";

export type Subscription = {
  recipientEmail: string;
  city: string;
  sendTime: string;
  tone: string;
  wifePersona: string;
  userPersona: string;
  constraints: string;
};

export type SubscriptionInput = Partial<Subscription> | null | undefined;

export type ValidationResult =
  | { ok: true; value: Subscription }
  | { ok: false; error: string };

export type LoveLineContext = {
  city: string;
  weather: string;
  tag: string;
  newsSummary: string[];
  prompt: string;
  loveLine: string;
};

export type SendLoveMailResult = {
  ok: boolean;
  simulated: boolean;
  sentTo: string;
  subject: string;
  weather: string;
  newsSummary: string[];
  loveLine: string;
  html: string;
  resend?: unknown;
  provider?: string;
  providerError?: {
    message: string;
    statusCode: number | null;
    name: string;
  };
};

const subscriptionFilePath = path.join(
  process.cwd(),
  "data",
  "subscription.json"
);
const blobSubscriptionPath = "config/subscription.json";

const toneTags: Record<string, string> = {
  温柔聪明: "克制温柔",
  克制高级: "安静高级",
  俏皮亲密: "轻盈亲密",
  文艺安抚: "柔和有画面",
};

const weatherCodeMap: Record<number, string> = {
  0: "晴朗",
  1: "大致晴",
  2: "局部多云",
  3: "阴天",
  45: "有雾",
  48: "雾凇",
  51: "毛毛雨",
  53: "小雨",
  55: "较强毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  80: "阵雨",
  81: "较强阵雨",
  82: "强阵雨",
  95: "雷雨",
};

export const defaultSubscription: Subscription = {
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

export function validateSubscription(body: SubscriptionInput): ValidationResult {
  const recipientEmail = body?.recipientEmail?.trim() ?? "";
  const city = body?.city?.trim() ?? "";
  const sendTime = body?.sendTime?.trim() ?? "";

  if (!recipientEmail) {
    return { ok: false, error: "缺少收件邮箱" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return { ok: false, error: "邮箱格式不正确" };
  }

  if (!city) {
    return { ok: false, error: "缺少城市" };
  }

  if (!isValidSendTime(sendTime)) {
    return { ok: false, error: "发送时间格式不正确" };
  }

  return {
    ok: true,
    value: {
      recipientEmail,
      city,
      sendTime,
      tone: body?.tone?.trim() || defaultSubscription.tone,
      wifePersona: body?.wifePersona?.trim() || defaultSubscription.wifePersona,
      userPersona: body?.userPersona?.trim() || defaultSubscription.userPersona,
      constraints: body?.constraints?.trim() || defaultSubscription.constraints,
    },
  };
}

export async function readStoredSubscription(): Promise<Subscription | null> {
  if (isBlobStorageEnabled()) {
    return readStoredSubscriptionFromBlob();
  }

  try {
    const raw = await fs.readFile(subscriptionFilePath, "utf-8");
    const parsed = JSON.parse(raw) as SubscriptionInput;
    const validated = validateSubscription(parsed);
    return validated.ok ? validated.value : null;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function saveSubscription(subscription: Subscription): Promise<void> {
  if (isBlobStorageEnabled()) {
    await saveSubscriptionToBlob(subscription);
    return;
  }

  await fs.mkdir(path.dirname(subscriptionFilePath), { recursive: true });
  await fs.writeFile(
    subscriptionFilePath,
    JSON.stringify(subscription, null, 2),
    "utf-8"
  );
}

export async function buildLoveLineContext(
  subscription: Subscription
): Promise<LoveLineContext> {
  const [weather, newsSummary] = await Promise.all([
    getWeatherSummary(subscription.city),
    getNewsSummary(subscription),
  ]);

  const prompt = buildPrompt(subscription, weather, newsSummary);

  return {
    city: subscription.city,
    weather,
    tag: `${subscription.tone} · ${toneTags[subscription.tone] ?? "日常关心"}`,
    newsSummary,
    prompt,
    loveLine: buildFallbackLoveLine(subscription, weather),
  };
}

export async function createGeneratedLoveLine(
  subscription: Subscription
): Promise<LoveLineContext> {
  const context = await buildLoveLineContext(subscription);

  try {
    const aiLoveLine = await maybeGenerateWithOpenAI(
      process.env.OPENAI_API_KEY,
      context.prompt
    );

    if (aiLoveLine) {
      return {
        ...context,
        loveLine: aiLoveLine,
      };
    }
  } catch (error) {
    console.error("OpenAI generation failed, fallback used:", error);
  }

  return context;
}

export async function sendLoveMail(
  subscription: Subscription
): Promise<SendLoveMailResult> {
  const context = await createGeneratedLoveLine(subscription);
  const subject = `给你的今日早安 · ${subscription.city}`;
  const html = `
    <div style="font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif; line-height: 1.8; color: #1f1b16; padding: 24px;">
      <div style="font-size: 13px; letter-spacing: 0.08em; color: #8a7f73; margin-bottom: 12px;">Morning Love Mail</div>
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 14px;">今日早安</div>
      <div style="font-size: 16px; margin-bottom: 20px;">${escapeHtml(context.loveLine)}</div>
      <div style="font-size: 13px; color: #8a7f73; margin-bottom: 8px;">${escapeHtml(context.weather)}</div>
      <div style="font-size: 13px; color: #8a7f73;">今日线索：${escapeHtml(
        context.newsSummary.join("；")
      )}</div>
    </div>
  `;

  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    return {
      ok: true,
      simulated: true,
      sentTo: subscription.recipientEmail,
      subject,
      weather: context.weather,
      newsSummary: context.newsSummary,
      loveLine: context.loveLine,
      html,
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: subscription.recipientEmail,
    subject,
    html,
  });

  if (result.error) {
    return {
      ok: false,
      simulated: false,
      sentTo: subscription.recipientEmail,
      subject,
      weather: context.weather,
      newsSummary: context.newsSummary,
      loveLine: context.loveLine,
      html,
      provider: "resend",
      providerError: result.error,
    };
  }

  return {
    ok: true,
    simulated: false,
    sentTo: subscription.recipientEmail,
    subject,
    weather: context.weather,
    newsSummary: context.newsSummary,
    loveLine: context.loveLine,
    html,
    resend: result,
  };
}

export async function maybeGenerateWithOpenAI(
  apiKey: string | undefined,
  prompt: string
): Promise<string | null> {
  if (!apiKey) {
    return null;
  }

  const openai = new OpenAI({
    apiKey,
    timeout: 15000,
  });

  const response = await openai.responses.create({
    model: "gpt-5",
    input: prompt,
  });

  const text = response.output_text?.trim();
  return text || null;
}

export function shouldSendAtCurrentTime(
  sendTime: string,
  now = new Date()
): boolean {
  if (!isValidSendTime(sendTime)) {
    return false;
  }

  const [hoursText, minutesText] = sendTime.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  const shanghaiParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const currentHour = Number(
    shanghaiParts.find((part) => part.type === "hour")?.value ?? "-1"
  );
  const currentMinute = Number(
    shanghaiParts.find((part) => part.type === "minute")?.value ?? "-1"
  );

  return currentHour === hours && currentMinute === minutes;
}

function isValidSendTime(sendTime: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(sendTime);
}

async function getWeatherSummary(city: string): Promise<string> {
  try {
    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.searchParams.set("name", city);
    geocodeUrl.searchParams.set("count", "1");
    geocodeUrl.searchParams.set("language", "zh");
    geocodeUrl.searchParams.set("format", "json");

    const geo = await fetchJson<OpenMeteoGeocodingResponse>(geocodeUrl.toString());
    const place = geo.results?.[0];

    if (!place) {
      return fallbackWeather(city);
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(place.latitude));
    forecastUrl.searchParams.set("longitude", String(place.longitude));
    forecastUrl.searchParams.set(
      "current",
      "temperature_2m,weather_code,wind_speed_10m"
    );
    forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
    forecastUrl.searchParams.set("forecast_days", "1");
    forecastUrl.searchParams.set("timezone", "Asia/Shanghai");

    const forecast = await fetchJson<OpenMeteoForecastResponse>(
      forecastUrl.toString()
    );
    const weatherText =
      weatherCodeMap[forecast.current?.weather_code ?? -1] ?? "天气平稳";
    const min = Math.round(forecast.daily?.temperature_2m_min?.[0] ?? 0);
    const max = Math.round(forecast.daily?.temperature_2m_max?.[0] ?? 0);
    const wind = Math.round(forecast.current?.wind_speed_10m ?? 0);

    return `${weatherText}，${min}~${max}°C，风速约 ${wind} km/h`;
  } catch (error) {
    console.error("weather fetch failed, fallback used:", error);
    return fallbackWeather(city);
  }
}

async function getNewsSummary(subscription: Subscription): Promise<string[]> {
  try {
    const gnewsApiKey = process.env.GNEWS_API_KEY;

    if (gnewsApiKey) {
      const query = buildNewsQuery(subscription);
      const url = new URL("https://gnews.io/api/v4/search");
      url.searchParams.set("q", query);
      url.searchParams.set("lang", "zh");
      url.searchParams.set("country", "cn");
      url.searchParams.set("max", "3");
      url.searchParams.set("sortby", "publishedAt");
      url.searchParams.set("apikey", gnewsApiKey);

      const response = await fetchJson<GNewsResponse>(url.toString());
      const titles = (response.articles ?? [])
        .map((article) => sanitizeHeadline(article.title))
        .filter(Boolean);

      if (titles.length > 0) {
        return titles.slice(0, 3);
      }
    }

    const rssUrl = new URL("https://news.google.com/rss/search");
    rssUrl.searchParams.set("q", `${buildNewsQuery(subscription)} when:1d`);
    rssUrl.searchParams.set("hl", "zh-CN");
    rssUrl.searchParams.set("gl", "CN");
    rssUrl.searchParams.set("ceid", "CN:zh-Hans");

    const xml = await fetchText(rssUrl.toString());
    const titles = extractRssTitles(xml);

    if (titles.length > 0) {
      return titles.slice(0, 3);
    }
  } catch (error) {
    console.error("news fetch failed, fallback used:", error);
  }

  return fallbackNewsSummary(subscription);
}

function buildPrompt(
  input: Subscription,
  weather: string,
  newsSummary: string[]
): string {
  return `
你是一个擅长把现实世界信号翻译成亲密表达的中文晨间文案助手。

请根据以下信息，生成一句适合早晨发给妻子的中文情话。

【天气】
城市：${input.city}
天气：${weather}

【重点新闻线索】
${newsSummary.map((item, index) => `${index + 1}. ${item}`).join("\n")}

【她的人物背景】
${input.wifePersona}

【我的人物背景】
${input.userPersona}

【表达风格】
${input.tone}

【额外约束】
${input.constraints}

要求：
1. 只输出一句中文，不要解释
2. 长度控制在 50 到 90 个中文字符
3. 像真实伴侣会说的话
4. 温柔、自然、克制，不要油腻，不像广告
5. 轻微映射天气和新闻情绪，但不要照搬标题
6. 带一点具体生活关心
`.trim();
}

function fallbackWeather(city: string): string {
  if (city.includes("上海")) {
    return "多云，14~21°C，早晚稍凉";
  }

  if (city.includes("北京")) {
    return "晴间多云，9~18°C，风有些清";
  }

  if (city.includes("深圳")) {
    return "温暖带湿意，21~27°C，出门不用太赶";
  }

  if (city.includes("杭州")) {
    return "薄雾转多云，13~22°C，空气里有一点潮润";
  }

  return `${city} 多云转晴，早晚微凉`;
}

function fallbackNewsSummary(subscription: Subscription): string[] {
  const mentionsLuxury =
    subscription.wifePersona.includes("LVMH") ||
    subscription.wifePersona.includes("Tiffany") ||
    subscription.wifePersona.includes("珠宝");
  const mentionsTech =
    subscription.userPersona.includes("智能驾驶") ||
    subscription.userPersona.includes("产品经理") ||
    subscription.userPersona.includes("技术");

  const lines = [
    "今天值得被记住的，不一定是最大的标题，而是世界情绪里那一点细微转向。",
    `${subscription.city} 的城市节奏不算急，适合把清晨留给更柔和的表达。`,
  ];

  if (mentionsLuxury && mentionsTech) {
    lines.push("设计感和技术判断仍在互相靠近，质感与效率不再是对立面。");
  } else if (mentionsLuxury) {
    lines.push("关于品牌、材质和故事感的讨论又多了一些，细节依然最能打动人。");
  } else if (mentionsTech) {
    lines.push("关于 AI 与产品判断的讨论还在升温，但好的体验最终总会回到人身上。");
  } else {
    lines.push("今天的新闻情绪偏复杂，越是这样，越显得安稳的关心珍贵。");
  }

  return lines;
}

function buildNewsQuery(subscription: Subscription): string {
  const segments = ["中国", "AI", "设计", "品牌"];

  if (
    subscription.wifePersona.includes("LVMH") ||
    subscription.wifePersona.includes("Tiffany") ||
    subscription.wifePersona.includes("珠宝")
  ) {
    segments.push("奢侈品");
  }

  if (
    subscription.userPersona.includes("智能驾驶") ||
    subscription.userPersona.includes("产品经理") ||
    subscription.userPersona.includes("技术")
  ) {
    segments.push("科技");
  }

  return segments.join(" OR ");
}

function extractRssTitles(xml: string): string[] {
  const titles: string[] = [];
  const matches = xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g);

  for (const match of matches) {
    const decoded = decodeXmlEntities(match[1] ?? "");
    const title = sanitizeHeadline(decoded);

    if (title) {
      titles.push(title);
    }
  }

  return titles;
}

function sanitizeHeadline(title: string): string {
  const cleaned = title
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/\s+-\s+[^-]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.includes("Google 新闻")) {
    return "";
  }

  return cleaned;
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function buildFallbackLoveLine(
  subscription: Subscription,
  weather: string
): string {
  const mentionsLuxury =
    subscription.wifePersona.includes("LVMH") ||
    subscription.wifePersona.includes("Tiffany") ||
    subscription.wifePersona.includes("珠宝");
  const mentionsTech =
    subscription.userPersona.includes("智能驾驶") ||
    subscription.userPersona.includes("产品经理") ||
    subscription.userPersona.includes("技术");
  const isPlayful = subscription.tone.includes("俏皮");
  const isArtful = subscription.tone.includes("文艺");

  if (isPlayful) {
    return `今天${subscription.city}的天气还算轻松，外面的世界再忙也不用和你抢节奏，你只管好好开始这一天，出门前记得吃早餐，我想让你从早上就被温柔照顾着。`;
  }

  if (isArtful) {
    return `今天${subscription.city}是${weather}，城市像被柔光轻轻按慢了一点，外面的消息照旧起伏，我更在意你怎样开始今天，记得挑件让自己舒服的衣服，也别空着肚子出门。`;
  }

  if (mentionsLuxury && mentionsTech) {
    return `今天${subscription.city}是${weather}，世界还在谈技术和品位怎样重新靠近，而我想到你时，先想到的总是你让日常也有光泽的能力，早上别赶，记得吃点热的再出门。`;
  }

  if (mentionsLuxury) {
    return `今天${subscription.city}是${weather}，外面的消息很多，但我更在意你会不会又把平常一天过得很有质感，早上给自己留一点从容，出门前记得把早餐和温度都顾好。`;
  }

  if (mentionsTech) {
    return `今天${subscription.city}是${weather}，新闻里还是变化和判断，可对我来说更重要的是你今天能顺顺利利地开始，别太早把自己交给忙碌，先认真吃早餐。`;
  }

  return `今天${subscription.city}是${weather}，世界照旧忙碌，但我还是想先把一点安稳留给你，愿你今天从清晨开始就有被照顾的感觉，记得吃早餐，也别让自己着凉。`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    latitude: number;
    longitude: number;
  }>;
};

type OpenMeteoForecastResponse = {
  current?: {
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
  };
};

type GNewsResponse = {
  articles?: Array<{
    title: string;
  }>;
};

function isBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readStoredSubscriptionFromBlob(): Promise<Subscription | null> {
  const result = await get(blobSubscriptionPath, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const raw = await new Response(result.stream).text();
  const parsed = JSON.parse(raw) as SubscriptionInput;
  const validated = validateSubscription(parsed);
  return validated.ok ? validated.value : null;
}

async function saveSubscriptionToBlob(subscription: Subscription): Promise<void> {
  await put(blobSubscriptionPath, JSON.stringify(subscription, null, 2), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}
