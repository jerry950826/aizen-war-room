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
  const route = await readFile(new URL("../cloudflare-api/src/index.ts", import.meta.url), "utf8");

  assert.match(route, /UPDATE members SET email=\?,name=\?,role=\?/);
  assert.match(route, /UPDATE permissions SET email=\?/);
  assert.match(route, /UPDATE sessions SET email=\?/);
  assert.match(route, /新信箱已被其他人使用/);
  assert.match(route, /requireSession\(request, env, request\.method === "POST"\)/);
});

test("所有允許登入人員都有頁面權限且管理員可調整角色", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-api/src/index.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /setPermissions\(Object\.fromEntries\(memberList\.map/);
  assert.match(page, /<option value="一般成員">一般成員<\/option>/);
  assert.match(page, /<option value="管理員">管理員<\/option>/);
  assert.match(page, /role: editMemberRole/);
  assert.match(route, /body\.role !== "管理員" && body\.role !== "一般成員"/);
  assert.doesNotMatch(page, /disabled=\{member\.email === email\}/);
  assert.match(route, /系統至少需要保留一位可登入的管理員/);
  assert.match(route, /role='管理員' AND active=1 AND email!=\?/);
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

test("今日運勢依生日星座與日期取得 API 內容", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /type View = "dashboard" \| "fortune"/);
  assert.match(page, /dailySeed\(`\$\{fortuneIdentity\}:\$\{dayKey\}`\)/);
  assert.match(page, />今日運勢</);
  assert.match(page, /DAILY HOROSCOPE/);
  assert.match(page, /AstroJson 每日運勢・繁體中文/);
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
  assert.match(page, /email: "jameschien@ai-zens\.com", birthday: "01-22"/);
  assert.match(page, /<dt>生日<\/dt>/);
  assert.match(page, /if \(!birthday\) return "收集中"/);
  assert.match(page, /signedInOrgPerson\?\.birthday \?\? email/);
});

test("生日可判斷星座並顯示 API 當日運勢", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /function zodiacFor\(birthday: string \| null\)/);
  assert.match(page, /name: "雙子座", apiSign: "gemini", icon: "♊"/);
  assert.match(page, /name: "獅子座", apiSign: "leo", icon: "♌"/);
  assert.match(page, /DAILY HOROSCOPE/);
  assert.match(page, /\{zodiac\.name\}今日運勢/);
  assert.match(page, /apiFortune\?\.horoscope/);
  assert.doesNotMatch(page, /className="fortune-score-value"/);
  assert.doesNotMatch(page, /className="fortune-metrics"/);
  assert.doesNotMatch(page, /className="fortune-chips"/);
});

test("Joanne 生日為六月二十七日並會套用巨蟹座運勢", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /email: "joannechen@ai-zens\.com", birthday: "06-27"/);
  assert.match(page, /name: "巨蟹座", apiSign: "cancer", icon: "♋"/);
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

test("登入頁不預填特定帳號或密碼", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /const \[user, setUser\] = useState\(""\)/);
  assert.match(page, /const \[email, setEmail\] = useState\(""\)/);
  assert.match(page, /const \[password, setPassword\] = useState\(""\)/);
  assert.match(page, /const profileName = user \|\| "使用者"/);
  assert.match(page, /className="login-card" onSubmit=\{login\} autoComplete="off"/);
  assert.match(page, /autoComplete="new-password"/);
  assert.match(page, /readOnly=\{activeLoginField !== "email"\}/);
  assert.match(page, /readOnly=\{activeLoginField !== "password"\}/);
  assert.match(page, /const \[rememberAccount, setRememberAccount\] = useState\(false\)/);
  assert.match(page, /checked=\{rememberAccount\}/);
  assert.doesNotMatch(page, /defaultChecked \/> 記住我的帳號/);
});

test("登入憑證保存一天並可在重新整理後恢復", async () => {
  const [loginRoute, sessionRoute, page] = await Promise.all([
    readFile(new URL("../cloudflare-api/src/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/war-room-session/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(loginRoute, /Max-Age=86400/);
  assert.match(loginRoute, /24 \* 60 \* 60 \* 1000/);
  assert.match(sessionRoute, /proxyControlApi\(request, "\/session"\)/);
  assert.match(page, /fetch\("\/api\/war-room-session", \{ cache: "no-store" \}\)/);
});

test("今日運勢串接 AstroJson 並在失敗時清楚標示", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/fortune/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /https:\/\/freehoroscopeapi\.com\/api\/v1/);
  assert.match(route, /https:\/\/api\.astrojson\.com\/v1\/horoscopes/);
  assert.match(route, /"X-API-KEY": apiKey/);
  assert.match(route, /horoscope\?\.general/);
  assert.match(route, /aspects: \{ career, finance, health, romance \}/);
  assert.match(route, /translate\.googleapis\.com\/translate_a\/single/);
  assert.match(route, /langpair", "en\|zh-TW"/);
  assert.match(route, /translated\.push\(await translateToTraditionalChinese\(text\)\)/);
  assert.match(route, /chineseCharacters < 12/);
  assert.match(route, /Cache-Control.*public, max-age=21600, s-maxage=21600/);
  assert.match(page, /fetch\(`\/api\/fortune\?sign=\$\{zodiac\.apiSign\}`/);
  assert.match(page, /apiFortune\?\.horoscope/);
  assert.match(page, /API 暫時無法使用/);
  assert.match(page, /AstroJson 每日運勢・繁體中文/);
  assert.match(page, /cache: "no-store"/);
});

test("塔羅牌提供五張牌選擇、翻牌與正逆位解讀", async () => {
  const [page, styles, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/fortune/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\[0, 1, 2, 3, 4\]\.map/);
  assert.match(page, /選一張今天最有感覺的牌/);
  assert.match(page, /drawTarot\(slot\)/);
  assert.match(route, /\/tarot\/cards/);
  assert.match(route, /orientation: reversed \? "reversed" : "upright"/);
  assert.match(styles, /\.tarot-choice\.chosen \.tarot-card-inner \{ transform: rotateY\(180deg\)/);
  assert.match(styles, /@keyframes tarot-reveal/);
});

test("重新整理後忽略空白 Bearer 並沿用一日登入 Cookie", async () => {
  const [proxy, api, page] = await Promise.all([
    readFile(new URL("../lib/control-api.ts", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-api/src/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(proxy, /\^Bearer\\s\+\\S\+\/i/);
  assert.match(api, /match\(\/\^Bearer\\s\+\(\\S\+\)\$\/i\)/);
  assert.match(page, /jerry: \{ leave: true, claims: true, instructors: true \}/);
});

test("三個業務系統都使用伺服器端登入交接", async () => {
  const [page, route, api] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/launch/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-api/src/index.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /dashboard-login/);
  assert.match(page, /window\.open\(`\/api\/launch\?service=\$\{service\.id\}`/);
  assert.match(route, /service === "instructors"/);
  assert.match(route, /DASHBOARD_SSO_SECRET/);
  assert.match(route, /DASHBOARD_URL/);
  assert.match(route, /userId,/);
  assert.match(route, /controlApiRequest\(request, `\/authorize\?service=\$\{service\}`\)/);
  assert.match(api, /你沒有此系統的存取權限/);
  assert.match(route, /loginUrl\.searchParams\.set\("returnTo"/);
  assert.match(page, /returnTo === "leave" \|\| returnTo === "claims" \|\| returnTo === "instructors"/);
  assert.match(page, /window\.location\.assign\(`\/api\/launch\?service=\$\{returnTo\}`\)/);
});

test("頁面權限名稱沿用允許登入名單資料", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /const member = permissionMember\(name\)/);
  assert.match(page, /const displayName = member\?\.name/);
  assert.match(page, /<b>\{displayName\}<\/b>/);
  assert.match(page, /email: member\.email/);
  assert.match(page, /responses\.find\(\(response\) => !response\.ok\)/);
  assert.match(page, /await loadSharedState\(token\)/);
});

test("今日運勢以 API 長文為主並支援響應式版面", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="fortune-hero fortune-api-hero"/);
  assert.match(page, /className="api-insight-grid"/);
  assert.match(page, /label: "財運"/);
  assert.match(page, /label: "愛情人際"/);
  assert.match(page, /label: "事業工作"/);
  assert.match(page, /label: "健康狀態"/);
  assert.match(styles, /\.fortune-api-hero \{ min-height: 330px; grid-template-columns: minmax\(0, 1fr\) 190px/);
  assert.match(styles, /\.fortune-api-hero \.fortune-summary p \{ max-width: 760px; font-size: 16px; line-height: 2/);
  assert.match(styles, /\.fortune-page \.page-heading \{ align-items: flex-start; flex-direction: column/);
});

test("共用主檔 migration 將固定權限轉成可擴充的系統權限", async () => {
  const [migration, schema, dictionary] = await Promise.all([
    readFile(new URL("../db/d1/003-core-master-data.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../../docs/data-inventory.md", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS departments/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS systems/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS member_system_permissions/);
  assert.match(migration, /SELECT p\.email, 'leave', p\.leave/);
  assert.match(migration, /SELECT p\.email, 'claims', p\.claims/);
  assert.match(migration, /SELECT p\.email, 'instructors', p\.instructors/);
  assert.match(schema, /export const memberSystemPermissions/);
  assert.match(dictionary, /每一類業務資料只能有一個權威來源/);
});

test("控制 API 雙寫新舊權限並優先讀取正規化權限", async () => {
  const worker = await readFile(new URL("../cloudflare-api/src/index.ts", import.meta.url), "utf8");

  assert.match(worker, /systemPermissions: systemPermissions\.results/);
  assert.match(worker, /INSERT INTO member_system_permissions/);
  assert.match(worker, /ON CONFLICT\(email,system_id\) DO UPDATE SET can_access=excluded\.can_access/);
  assert.match(worker, /COALESCE\(\(SELECT can_access FROM member_system_permissions/);
  assert.match(worker, /DELETE FROM member_system_permissions WHERE email=\?/);
});

test("講師看板排程資料會正規化並保留舊快照", async () => {
  const [migration, orderingMigration, schema, worker] = await Promise.all([
    readFile(new URL("../db/d1/004-instructor-normalized-data.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/d1/005-instructor-sort-order.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-api/src/index.ts", import.meta.url), "utf8"),
  ]);

  for (const table of [
    "instructor_teachers",
    "instructor_cohort_records",
    "instructor_course_events",
    "instructor_message_templates",
    "instructor_schedule_audit_logs",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(worker, new RegExp(`INSERT INTO ${table}`));
  }
  assert.match(migration, /json_each\(store\.value, '\$\.events'\)/);
  assert.match(worker, /INSERT INTO instructor_app_store/);
  assert.match(worker, /Invalid store JSON/);
  assert.match(worker, /FROM instructor_course_events ORDER BY sort_order/);
  assert.match(worker, /value: JSON\.stringify\(value\)/);
  assert.match(orderingMigration, /ALTER TABLE instructor_course_events ADD COLUMN sort_order/);
  assert.match(orderingMigration, /json_each\(store\.value, '\$\.events'\)/);
  assert.match(schema, /export const instructorCourseEvents/);
  assert.match(schema, /sortOrder: integer\("sort_order"\)/);
  assert.match(worker, /json_extract\(j\.value,'\$\.active'\)/);
  assert.match(worker, /ORDER BY active DESC,t\.sort_order/);
});
