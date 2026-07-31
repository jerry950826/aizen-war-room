import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("人員名單提供姓名與公司信箱編輯介面", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /startEditingMember/);
  assert.match(page, /saveMember/);
  assert.match(page, /姓名與公司信箱不可空白/);
  assert.match(page, /action:\s*"edit"/);
  assert.match(page, />儲存</);
  assert.match(page, />取消</);
});

test("伺服器同步更新人員、權限與登入紀錄", async () => {
  const route = await readFile(new URL("../app/api/control-state/route.ts", import.meta.url), "utf8");

  assert.match(route, /UPDATE members SET email=\?,name=\?/);
  assert.match(route, /UPDATE permissions SET email=\?/);
  assert.match(route, /UPDATE sessions SET email=\?/);
  assert.match(route, /新信箱已被其他人使用/);
  assert.match(route, /requireSession\(request, true\)/);
});

test("公司組織圖包含請假系統全員且只讓管理員調整登入", async () => {
  const [page, database] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/control-db.ts", import.meta.url), "utf8"),
  ]);

  for (const name of ["Maggie", "Emily", "Jerry", "James", "Pearl", "Blair", "Sean", "Joanne", "Cat", "Gary", "Sharlene", "Rita"]) {
    assert.match(page, new RegExp(`english: "${name}"`));
  }
  assert.match(page, />公司組織圖</);
  assert.match(page, /\{isAdmin && <section className="organization-admin">/);
  assert.match(database, /sinyunpan@ai-zens\.com/);
});

test("修正既有 Pearl、Gary 與 Sharlene 顯示名稱", async () => {
  const database = await readFile(new URL("../lib/control-db.ts", import.meta.url), "utf8");

  assert.match(database, /\["pearlchen@ai-zens\.com", "Pearlchen", "Pearl 陳品樺"\]/);
  assert.match(database, /\["garyshih@ai-zens\.com", "Garyshih", "Gary 石孟玄"\]/);
  assert.match(database, /\["sinyunpan@ai-zens\.com", "Sinyunpan", "Sharlene 潘欣芸"\]/);
  assert.match(database, /UPDATE members SET name=\? WHERE email=\? AND name=\?/);
});

test("今日運勢依帳號與日期固定並提供注意事項", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /type View = "dashboard" \| "fortune"/);
  assert.match(page, /dailySeed\(`\$\{fortuneIdentity\}:\$\{dayKey\}`\)/);
  assert.match(page, />今日運勢</);
  assert.match(page, /今天該注意什麼/);
  assert.match(page, /生日運勢・輕鬆參考/);
});

test("右上日期與今日運勢使用台北時區的動態日期", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /function taipeiToday\(\)/);
  assert.match(page, /timeZone: "Asia\/Taipei"/);
  assert.match(page, /<span className="date">\{currentDay\.topbar\}<\/span>/);
  assert.doesNotMatch(page, /2026 年 7 月 29 日・星期三/);
});

test("組織聯絡資訊顯示生日且未提供者標示收集中", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /email: "emilychang@ai-zens\.com", birthday: "06-10"/);
  assert.match(page, /email: "garyshih@ai-zens\.com", birthday: "07-23"/);
  assert.match(page, /email: "jameschien@ai-zens\.com", birthday: null/);
  assert.match(page, /<dt>生日<\/dt>/);
  assert.match(page, /if \(!birthday\) return "收集中"/);
  assert.match(page, /signedInOrgPerson\?\.birthday \?\? email/);
});

test("生日可判斷星座並顯示趣味運勢內容", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /function zodiacFor\(birthday: string \| null\)/);
  assert.match(page, /name: "雙子座", icon: "♊"/);
  assert.match(page, /name: "獅子座", icon: "♌"/);
  assert.match(page, /今日小任務/);
  assert.match(page, /今日避雷/);
  assert.match(page, /宇宙悄悄話/);
  assert.match(page, /今日關鍵字/);
  assert.match(page, /今日宜/);
  assert.match(page, /能量補給/);
  assert.match(page, /社交暗號/);
});

test("Joanne 生日為六月二十七日並會套用巨蟹座運勢", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /email: "joannechen@ai-zens\.com", birthday: "06-27"/);
  assert.match(page, /name: "巨蟹座", icon: "♋"/);
});

test("登入欄位使用一致圖示並覆蓋瀏覽器自動填入底色", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="field-icon email-field-icon"/);
  assert.match(page, /className="field-icon lock-field-icon"/);
  assert.match(styles, /grid-template-columns: 48px minmax\(0, 1fr\) auto/);
  assert.match(styles, /input:-webkit-autofill/);
});
