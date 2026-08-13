import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";

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

async function translateToTraditionalChinese(text: string) {
  const translationUrl = new URL("https://api.mymemory.translated.net/get");
  translationUrl.searchParams.set("q", text.slice(0, 450));
  translationUrl.searchParams.set("langpair", "en|zh-TW");
  const result = await fetchJson(translationUrl.toString()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  const translatedText = result.responseData?.translatedText?.trim();
  const chineseCharacters = translatedText?.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  if (!translatedText || chineseCharacters < 12 || (result.responseStatus && result.responseStatus !== 200)) {
    throw new Error("Translation API returned an incomplete response");
  }
  return translatedText;
}

export async function GET(request: NextRequest) {
  const sign = request.nextUrl.searchParams.get("sign")?.toLowerCase() ?? "";
  if (!zodiacSigns.has(sign)) {
    return NextResponse.json({ error: "不支援的星座" }, { status: 400 });
  }

  let failureStage = "astrojson";
  try {
    const apiKey = (env as { ASTROJSON_API_KEY?: string }).ASTROJSON_API_KEY;
    if (!apiKey) throw new Error("AstroJson API key is not configured");
    const response = await fetch(`${astroJsonBaseUrl}?sign=${encodeURIComponent(sign)}&lang=en&date=today&period=daily`, {
      headers: { Accept: "application/json", "X-API-KEY": apiKey },
      cf: { cacheTtl: 21600, cacheEverything: true },
    });
    if (!response.ok) throw new Error(`AstroJson returned ${response.status}`);
    const result = await response.json() as {
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
      translated.push(await translateToTraditionalChinese(text));
    }
    const [general, career, finance, health, romance] = translated;
    return NextResponse.json({
      date: result.date,
      sign: result.sign,
      horoscope: general,
      aspects: { career, finance, health, romance },
      scores: result.horoscopeScore,
      source: "astrojson-translated",
    }, {
      headers: { "Cache-Control": "public, max-age=21600, s-maxage=21600" },
    });
  } catch {
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
  return NextResponse.json({
    card: {
      name: card.name,
      code: card.name_short,
      arcana: card.type,
      orientation: reversed ? "reversed" : "upright",
      meaning: reversed ? card.meaning_rev : card.meaning_up,
      description: card.desc,
    },
    source,
  });
}
