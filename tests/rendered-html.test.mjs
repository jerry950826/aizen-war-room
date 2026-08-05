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

  assert.match(route, /UPDATE members SET email=\?,name=\?,role=\?/);
  assert.match(route, /UPDATE permissions SET email=\?/);
  assert.match(route, /UPDATE sessions SET email=\?/);
  assert.match(route, /新信箱已被其他人使用/);
  assert.match(route, /requireSession\(request, true\)/);
});

test("所有允許登入人員都有頁面權限且管理員可調整角色", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/control-state/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /setPermissions\(Object\.fromEntries\(memberList\.map/);
  assert.match(page, /<option value="一般成員">一般成員<\/option>/);
  assert.match(page, /<option value="管理員">管理員<\/option>/);
  assert.match(page, /role: editMemberRole/);
  assert.match(route, /newRole !== "管理員" && newRole !== "一般成員"/);
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
  assert.match(page, /email: "jameschien@ai-zens\.com", birthday: "01-22"/);
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
    readFile(new URL("../app/api/war-room-login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/war-room-session/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(loginRoute, /Max-Age=86400/);
  assert.match(loginRoute, /24 \* 60 \* 60 \* 1000/);
  assert.match(sessionRoute, /requireSession\(request\)/);
  assert.match(page, /fetch\("\/api\/war-room-session", \{ cache: "no-store" \}\)/);
});

test("三個業務系統都使用伺服器端登入交接", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/launch/route.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /dashboard-login/);
  assert.match(page, /window\.open\(`\/api\/launch\?service=\$\{service\.id\}`/);
  assert.match(route, /service === "instructors"/);
  assert.match(route, /DASHBOARD_SSO_SECRET/);
  assert.match(route, /DASHBOARD_URL/);
  assert.match(route, /userId,/);
  assert.match(route, /SELECT leave,claims,instructors FROM permissions/);
  assert.match(route, /你沒有此系統的存取權限/);
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

test("今日運勢使用對齊的等高卡片與響應式欄位", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="fortune-score-value"/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) minmax\(0, 1\.35fr\)/);
  assert.match(styles, /\.fortune-metrics article \{ min-height: 132px; display: grid/);
  assert.match(styles, /\.fortune-page \.page-heading \{ align-items: flex-start; flex-direction: column/);
});
