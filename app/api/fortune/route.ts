import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { controlApiRequest } from "../../../lib/control-api";

const astroJsonBaseUrl = "https://api.astrojson.com/v1/horoscopes";
const zodiacSigns = new Set([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]);

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Fortune API returned ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function translateToTraditionalChinese(text: string, minimumChineseCharacters = 12) {
  const translationUrl = new URL("https://translate.googleapis.com/translate_a/single");
  translationUrl.searchParams.set("client", "gtx");
  translationUrl.searchParams.set("sl", "en");
  translationUrl.searchParams.set("tl", "zh-TW");
  translationUrl.searchParams.set("dt", "t");
  translationUrl.searchParams.set("q", text);
  const result = await fetchJson(translationUrl.toString()) as Array<Array<Array<string>>>;
  const translatedText = result[0]?.map((segment) => segment[0]).join("").trim();
  const chineseCharacters = translatedText?.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  if (!translatedText || chineseCharacters < minimumChineseCharacters) {
    throw new Error("Translation API returned an incomplete response");
  }
  return translatedText;
}

function taipeiDayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function removeAstrologyTerms(text: string) {
  const astrologyTerms = /\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|zodiac|planet|retrograde|transit|conjunction|opposition|square|trine|sextile|aspect|celestial|cosmic|lunar|solar|new moon|full moon)\b/i;
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  const everydaySentences = sentences.filter((sentence) => !astrologyTerms.test(sentence));
  if (everydaySentences.length) return everydaySentences.join(" ").trim();
  return text
    .replace(/\b(?:with|as|while|because)\s+(?:the\s+)?(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)[^,.;]*[,.;]?/gi, "")
    .replace(astrologyTerms, "today")
    .trim();
}

function makePlainChinese(text: string, kind: "mood" | "finance" | "romance" | "career" | "health") {
  const replacements: Array<[RegExp, string]> = [
    [/財務狀況/g, "手頭上的錢"],
    [/財務/g, "金錢"],
    [/職業生涯/g, "工作"],
    [/職場環境/g, "工作場合"],
    [/人際關係/g, "跟別人的相處"],
    [/溝通交流/g, "好好說話"],
    [/情緒波動/g, "心情起伏"],
    [/潛在的/g, "可能的"],
    [/機遇/g, "好機會"],
    [/挑戰/g, "難題"],
    [/審慎/g, "多想一下"],
    [/謹慎/g, "小心一點"],
    [/宜採取/g, "可以試著"],
    [/有助於/g, "能幫你"],
    [/著重於/g, "先把重點放在"],
  ];
  let plain = text.replace(/\s+/g, "").replace(/；/g, "，");
  for (const [pattern, replacement] of replacements) plain = plain.replace(pattern, replacement);
  plain = plain
    .replace(/(?:太陽|月亮|水星|金星|火星|木星|土星|天王星|海王星|冥王星|新月|滿月|逆行|相位|星象|行星)[^，。！？]*[，。！？]?/g, "")
    .replace(/今天今天/g, "今天");
  const sentences = plain.match(/[^。！？]+[。！？]?/g) ?? [plain];
  const message = sentences.slice(0, 2).join("").trim();
  const prefixes = {
    mood: "今天的心情：",
    finance: "今天金錢上要注意：",
    romance: "今天跟別人相處：",
    career: "今天工作上可以這樣做：",
    health: "今天身體要注意：",
  };
  return `${prefixes[kind]}${message}`;
}

function emergencyPlainChinese(text: string, kind: "mood" | "finance" | "romance" | "career" | "health", score?: number) {
  const level = typeof score === "number" && score >= 4 ? "順利" : typeof score === "number" && score <= 2 ? "需要放慢" : "平穩";
  const choices = {
    mood: [`今天心情大致${level}，先把最重要的事情做好，不用一次扛太多。`, `今天容易想得比較多，照自己的步調走，臨時變化也不用急。`],
    finance: [`今天金錢狀況${level}，先顧好必要開銷，較大的決定多看一眼。`, `今天花錢前先停一下，確認真的需要再出手，會比較安心。`],
    romance: [`今天人際互動${level}，有話直接說清楚，比猜來猜去更省力。`, `今天多聽對方說完再回應，小小的體貼會讓關係更順。`],
    career: [`今天工作節奏${level}，先完成最關鍵的一件事，再處理其他雜事。`, `今天工作上適合把步驟排清楚，遇到不確定就先問，別悶著做。`],
    health: [`今天身體狀態${level}，記得補水、起身活動，累了就稍微休息。`, `今天不要把行程排太滿，肩頸與眼睛累時就停下來放鬆一下。`],
  };
  let hash = 0;
  for (const character of text) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return choices[kind][hash % choices[kind].length];
}

async function getDailyAstroJson(sign: string, apiKey: string) {
  const response = await fetch(`${astroJsonBaseUrl}?sign=${encodeURIComponent(sign)}&lang=en&date=${taipeiDayKey()}&period=daily`, {
    headers: { Accept: "application/json", "X-API-KEY": apiKey },
    cf: { cacheTtl: 90000, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`AstroJson returned ${response.status}`);
  return response.json();
}

type StoredFortune = {
  date?: string;
  sign?: string;
  horoscope: string;
  aspects: { career: string; finance: string; health: string; romance: string };
  scores?: { general?: number; career?: number; finance?: number; health?: number; romance?: number };
  source: string;
};

async function fortuneCacheRequest(request: Request, path: string, body?: unknown) {
  const cacheRequest = body === undefined ? request : new Request(request.url, {
    method: "POST",
    headers: { Cookie: request.headers.get("Cookie") ?? "", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return controlApiRequest(cacheRequest, path, body === undefined ? "GET" : "POST");
}

export async function GET(request: NextRequest) {
  const sign = request.nextUrl.searchParams.get("sign")?.toLowerCase() ?? "";
  if (!zodiacSigns.has(sign)) {
    return NextResponse.json({ error: "不支援的星座" }, { status: 400 });
  }

  let failureStage = "astrojson";
  let claimedDate = "";
  let claimedSign = "";
  let claimedOwnerToken = "";
  try {
    const fortuneDate = taipeiDayKey();
    const lookup = await fortuneCacheRequest(request, `/fortune-cache?date=${encodeURIComponent(fortuneDate)}&sign=${encodeURIComponent(sign)}`);
    if (!lookup.ok) return NextResponse.json({ error: "請先登入" }, { status: lookup.status });
    const lookupData = await lookup.json() as { row?: { status?: string; resultJson?: string | null } };
    if (lookupData.row?.status === "ready" && lookupData.row.resultJson) {
      return NextResponse.json(JSON.parse(lookupData.row.resultJson), { headers: { "Cache-Control": "private, no-store" } });
    }

    const ownerToken = crypto.randomUUID();
    const claimResponse = await fortuneCacheRequest(request, "/fortune-cache", { action: "claim", date: fortuneDate, sign, ownerToken });
    const claimData = await claimResponse.json() as { row?: { status?: string; ownerToken?: string; resultJson?: string | null } };
    if (claimData.row?.status === "ready" && claimData.row.resultJson) {
      return NextResponse.json(JSON.parse(claimData.row.resultJson), { headers: { "Cache-Control": "private, no-store" } });
    }
    if (claimData.row?.ownerToken !== ownerToken) {
      return NextResponse.json({ error: "今日運勢正在準備中，請稍後再試" }, { status: 202 });
    }
    claimedDate = fortuneDate;
    claimedSign = sign;
    claimedOwnerToken = ownerToken;

    const apiKey = (env as { ASTROJSON_API_KEY?: string }).ASTROJSON_API_KEY;
    if (!apiKey) throw new Error("AstroJson API key is not configured");
    const result = await getDailyAstroJson(sign, apiKey) as {
      date?: string;
      sign?: string;
      color?: string;
      colorHex?: string;
      luckyNumber?: number;
      luckyTime?: string;
      mood?: string;
      compatibility?: string[];
      horoscope?: { general?: string; career?: string; finance?: string; health?: string; romance?: string };
      horoscopeScore?: { general?: number; career?: number; finance?: number; health?: number; romance?: number };
    };
    const horoscope = result.horoscope;
    if (!horoscope?.general || !horoscope.career || !horoscope.finance || !horoscope.health || !horoscope.romance) {
      throw new Error("AstroJson returned an incomplete response");
    }
    failureStage = "translation";
    const sourceTexts = [horoscope.general, horoscope.career, horoscope.finance, horoscope.health, horoscope.romance];
    const kinds = ["mood", "career", "finance", "health", "romance"] as const;
    const scores = [result.horoscopeScore?.general, result.horoscopeScore?.career, result.horoscopeScore?.finance, result.horoscopeScore?.health, result.horoscopeScore?.romance];
    const translated = await Promise.allSettled(sourceTexts.map((text) => translateToTraditionalChinese(removeAstrologyTerms(text))));
    const plainTexts = translated.map((translation, index) => translation.status === "fulfilled"
      ? makePlainChinese(translation.value, kinds[index])
      : emergencyPlainChinese(sourceTexts[index], kinds[index], scores[index]));
    const [general, career, finance, health, romance] = plainTexts;
    const fortuneResult: StoredFortune = {
      date: result.date,
      sign: result.sign,
      horoscope: general,
      aspects: { career, finance, health, romance },
      scores: result.horoscopeScore,
      source: translated.every((translation) => translation.status === "fulfilled")
        ? "astrojson-daily-cache-plain-zh-tw"
        : "astrojson-daily-cache-plain-zh-tw-resilient",
    };
    await fortuneCacheRequest(request, "/fortune-cache", { action: "store", date: fortuneDate, sign, ownerToken, result: fortuneResult });
    return NextResponse.json(fortuneResult, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Daily fortune failed", { stage: failureStage, message: error instanceof Error ? error.message : "Unknown error" });
    if (claimedOwnerToken) {
      await fortuneCacheRequest(request, "/fortune-cache", {
        action: "release", date: claimedDate, sign: claimedSign, ownerToken: claimedOwnerToken,
      }).catch(() => null);
    }
    return NextResponse.json({ error: "今日 API 運勢暫時無法取得", stage: failureStage }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { slot?: number } | null;
  const slot = Number(body?.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot > 4) {
    return NextResponse.json({ error: "請從五張牌中選擇一張" }, { status: 400 });
  }

  const fortunes = [
    { name: "大吉", meaning: "今天很適合主動往前走，想做的事情可以放心開始。", description: "行動提醒：把握眼前的好機會，重要的事優先處理。" },
    { name: "吉", meaning: "今天整體順利，只要照原本的節奏走，就容易有好結果。", description: "行動提醒：穩穩完成手上的事，不需要急著一次做到完美。" },
    { name: "中吉", meaning: "今天有好有壞，但只要保持耐心，事情會慢慢往好的方向走。", description: "行動提醒：遇到卡關先停一下，換個方法再試。" },
    { name: "小吉", meaning: "今天的小確幸藏在細節裡，放慢一點會更容易發現。", description: "行動提醒：先完成一件小事，累積成就感再繼續。" },
    { name: "末吉", meaning: "今天不必急著看到成果，先把基礎做好，之後會越來越順。", description: "行動提醒：少做重大決定，多整理、確認與準備。" },
    { name: "凶", meaning: "今天容易不耐煩或遇到小阻礙，慢一點反而比較安全。", description: "行動提醒：避免衝動答應、花錢或回話，重要決定明天再確認。" },
    { name: "大凶", meaning: "今天可能比較累、心情也容易受影響，先照顧好自己最重要。", description: "行動提醒：不勉強、不硬撐，避開爭執與高風險決定。" },
  ];
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  const fortune = fortunes[(random + slot * 17) % fortunes.length];
  return NextResponse.json({
    card: {
      name: fortune.name,
      code: `lot-${slot + 1}`,
      arcana: "籤詩",
      orientation: "upright",
      meaning: fortune.meaning,
      description: fortune.description,
    },
    source: "local-fortune-lots",
  });
}
