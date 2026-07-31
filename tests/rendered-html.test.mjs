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
