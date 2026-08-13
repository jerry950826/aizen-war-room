import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { controlApiRequest } from "../../../lib/control-api";

const apiBaseUrl = "https://freehoroscopeapi.com/api/v1";
const astroJsonBaseUrl = "https://api.astrojson.com/v1/horoscopes";
const zodiacSigns = new Set([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]);

type TarotCard = {
  type: "major" | "minor";
  name: string;
  name_short: string;
  meaning_up: string;
  meaning_rev: string;
  desc: string;
};

const fallbackCards: TarotCard[] = [
  { type: "major", name: "The Fool", name_short: "ar00", meaning_up: "新的開始、自由與相信直覺。", meaning_rev: "先停一下，別讓衝動替你做決定。", desc: "旅人站在新旅程的起點。" },
  { type: "major", name: "The Magician", name_short: "ar01", meaning_up: "資源已在手上，現在適合主動展開。", meaning_rev: "重新確認目的，別把力氣用錯地方。", desc: "魔術師提醒你把想法化為行動。" },
  { type: "major", name: "The High Priestess", name_short: "ar02", meaning_up: "安靜觀察，答案正在直覺裡成形。", meaning_rev: "雜音太多，先留一點空間給自己。", desc: "女祭司象徵直覺與尚未揭開的訊息。" },
  { type: "major", name: "The Sun", name_short: "ar19", meaning_up: "清晰、活力與值得分享的好消息。", meaning_rev: "光仍然在，只是需要調整期待。", desc: "太陽帶來坦率、溫暖與生命力。" },
  { type: "major", name: "The World", name_short: "ar21", meaning_up: "一段歷程完成，成果值得被肯定。", meaning_rev: "最後一步尚未完成，耐心把它收好。", desc: "世界象徵完成、整合與新的循環。" },
];

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
    const translated: string[] = [];
    for (const text of [horoscope.general, horoscope.career, horoscope.finance, horoscope.health, horoscope.romance]) {
      translated.push(await translateToTraditionalChinese(removeAstrologyTerms(text)));
    }
    const [generalText, careerText, financeText, healthText, romanceText] = translated;
    const general = makePlainChinese(generalText, "mood");
    const career = makePlainChinese(careerText, "career");
    const finance = makePlainChinese(financeText, "finance");
    const health = makePlainChinese(healthText, "health");
    const romance = makePlainChinese(romanceText, "romance");
    const fortuneResult: StoredFortune = {
      date: result.date,
      sign: result.sign,
      horoscope: general,
      aspects: { career, finance, health, romance },
      scores: result.horoscopeScore,
      source: "astrojson-daily-cache-plain-zh-tw",
    };
    await fortuneCacheRequest(request, "/fortune-cache", { action: "store", date: fortuneDate, sign, ownerToken, result: fortuneResult });
    return NextResponse.json(fortuneResult, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
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

  let cards = fallbackCards;
  let source = "fallback";
  try {
    const result = await fetchJson(`${apiBaseUrl}/tarot/cards`) as { cards?: TarotCard[] };
    if (Array.isArray(result.cards) && result.cards.length) {
      cards = result.cards;
      source = "api";
    }
  } catch {
    // The local cards keep the draw usable when the free provider is unavailable.
  }

  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  const card = cards[(random + slot * 17) % cards.length];
  const reversed = ((random >>> 3) + slot) % 4 === 0;
  const [translatedName, translatedMeaning, translatedDescription] = await Promise.all([
    translateToTraditionalChinese(card.name, 1),
    translateToTraditionalChinese(reversed ? card.meaning_rev : card.meaning_up),
    translateToTraditionalChinese(card.desc),
  ]);
  return NextResponse.json({
    card: {
      name: translatedName,
      code: card.name_short,
      arcana: card.type,
      orientation: reversed ? "reversed" : "upright",
      meaning: translatedMeaning,
      description: translatedDescription,
    },
    source,
  });
}
