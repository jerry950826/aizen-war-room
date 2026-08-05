"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "dashboard" | "fortune" | "password" | "permissions" | "people";
type ServiceId = "leave" | "claims" | "instructors";
type Member = { email: string; name: string; role: "管理員" | "一般成員"; active: boolean };
type OrgPerson = { id: string; department: string; level: 1 | 2 | 3; title: string; english: string; name: string; phone: string; email: string; birthday: string | null };

const services: Array<{
  id: ServiceId;
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  color: string;
  icon: string;
  url: string;
}> = [
  {
    id: "leave",
    eyebrow: "人事作業",
    title: "請假系統",
    description: "假單申請、簽核進度與年度假別餘額",
    metric: "06",
    metricLabel: "待簽核",
    color: "#0073df",
    icon: "休",
    url: "https://leaveflow-tw.jerry950826.chatgpt.site/leave",
  },
  {
    id: "claims",
    eyebrow: "財務作業",
    title: "請款系統",
    description: "費用申請、單據核銷與付款進度追蹤",
    metric: "12",
    metricLabel: "處理中",
    color: "#ff0000",
    icon: "款",
    url: "https://leaveflow-tw.jerry950826.chatgpt.site/claims",
  },
  {
    id: "instructors",
    eyebrow: "教務營運",
    title: "講師看板",
    description: "講師排程、授課時數與合作狀態總覽",
    metric: "28",
    metricLabel: "本月場次",
    color: "#1685c5",
    icon: "講",
    url: "https://aizen-instructor-dashboard.jerry950826.chatgpt.site",
  },
];

const initialPermissions: Record<string, Record<ServiceId, boolean>> = {
  maggie: { leave: true, claims: true, instructors: true },
  rita: { leave: true, claims: true, instructors: false },
  jerry: { leave: false, claims: true, instructors: true },
  emily: { leave: true, claims: true, instructors: true },
  james: { leave: true, claims: true, instructors: true },
  pearlchen: { leave: true, claims: true, instructors: true },
  blairpeng: { leave: true, claims: true, instructors: true },
  seanchang: { leave: true, claims: true, instructors: true },
  joannechen: { leave: true, claims: true, instructors: true },
  catchen: { leave: true, claims: true, instructors: true },
  garyshih: { leave: true, claims: true, instructors: true },
  sinyunpan: { leave: true, claims: true, instructors: true },
};

const adminEmails: Record<string, string> = {
  "maggiefang@ai-zens.com": "maggie",
  "ritahsieh@ai-zens.com": "rita",
  "jerrychang@ai-zens.com": "jerry",
  "emilychang@ai-zens.com": "emily",
  "jameschien@ai-zens.com": "james",
};

const userProfiles: Record<string, { english: string; name: string; department: string; title: string }> = {
  maggie: { english: "Maggie", name: "房美華", department: "總經理室", title: "總經理" },
  rita: { english: "Rita", name: "謝雨如", department: "企劃部", title: "企劃兼行政" },
  jerry: { english: "Jerry", name: "張廷", department: "技術部", title: "前端工程師" },
  emily: { english: "Emily", name: "張芷瑄", department: "技術部", title: "前端工程師" },
  james: { english: "James", name: "簡侑俊", department: "技術部", title: "後端工程師" },
};

const initialMembers: Member[] = [
  { email: "maggiefang@ai-zens.com", name: "Maggie 房美華", role: "管理員", active: true },
  { email: "ritahsieh@ai-zens.com", name: "Rita 謝雨如", role: "管理員", active: true },
  { email: "jerrychang@ai-zens.com", name: "Jerry 張廷", role: "管理員", active: true },
  { email: "emilychang@ai-zens.com", name: "Emily 張芷瑄", role: "一般成員", active: true },
  { email: "jameschien@ai-zens.com", name: "James 簡侑俊", role: "一般成員", active: true },
  { email: "pearlchen@ai-zens.com", name: "Pearl 陳品樺", role: "一般成員", active: true },
  { email: "blairpeng@ai-zens.com", name: "Blair 彭愛媛", role: "一般成員", active: true },
  { email: "seanchang@ai-zens.com", name: "Sean 張智翔", role: "一般成員", active: true },
  { email: "joannechen@ai-zens.com", name: "Joanne 陳靜宜", role: "一般成員", active: true },
  { email: "catchen@ai-zens.com", name: "Cat 陳瑾虹", role: "一般成員", active: true },
  { email: "garyshih@ai-zens.com", name: "Gary 石孟玄", role: "一般成員", active: true },
  { email: "sinyunpan@ai-zens.com", name: "Sharlene 潘欣芸", role: "一般成員", active: true },
];

const initialOrganizationPeople: OrgPerson[] = [
  { id: "maggie", department: "總經理室", level: 1, title: "總經理", english: "Maggie", name: "房美華", phone: "0937-138902", email: "maggiefang@ai-zens.com", birthday: "12-01" },
  { id: "emily", department: "技術部", level: 2, title: "前端工程師", english: "Emily", name: "張芷瑄", phone: "0970-672188", email: "emilychang@ai-zens.com", birthday: "06-10" },
  { id: "jerry", department: "技術部", level: 2, title: "前端工程師", english: "Jerry", name: "張廷", phone: "0975-750220", email: "jerrychang@ai-zens.com", birthday: "08-26" },
  { id: "james", department: "技術部", level: 2, title: "後端工程師", english: "James", name: "簡侑俊", phone: "0968-813952", email: "jameschien@ai-zens.com", birthday: "01-22" },
  { id: "pearl", department: "設計部", level: 2, title: "產品設計師", english: "Pearl", name: "陳品樺", phone: "0979-635252", email: "pearlchen@ai-zens.com", birthday: "08-01" },
  { id: "blair", department: "設計部", level: 2, title: "數位設計師", english: "Blair", name: "彭愛媛", phone: "0988-506226", email: "blairpeng@ai-zens.com", birthday: "07-12" },
  { id: "sean", department: "業務部", level: 2, title: "資深業務經理", english: "Sean", name: "張智翔", phone: "0985-699592", email: "seanchang@ai-zens.com", birthday: null },
  { id: "joanne", department: "業務部", level: 2, title: "資深業務經理", english: "Joanne", name: "陳靜宜", phone: "0912-582956", email: "joannechen@ai-zens.com", birthday: "06-27" },
  { id: "cat", department: "行銷部", level: 2, title: "行銷主任", english: "Cat", name: "陳瑾虹", phone: "0972-866530", email: "catchen@ai-zens.com", birthday: "02-04" },
  { id: "gary", department: "行銷部", level: 3, title: "行銷專員", english: "Gary", name: "石孟玄", phone: "0912-818915", email: "garyshih@ai-zens.com", birthday: "07-23" },
  { id: "sharlene", department: "行銷部", level: 3, title: "內容行銷專員", english: "Sharlene", name: "潘欣芸", phone: "0958-031793", email: "sinyunpan@ai-zens.com", birthday: "03-17" },
  { id: "rita", department: "企劃部", level: 2, title: "企劃兼行政", english: "Rita", name: "謝雨如", phone: "0927-765167", email: "ritahsieh@ai-zens.com", birthday: "10-10" },
];

const fortuneThemes = [
  { title: "穩中有進", summary: "今天適合把重要工作往前推一步，先完成最有影響力的事情。", focus: "聚焦一件關鍵任務，比同時處理很多小事更有效。" },
  { title: "放慢確認", summary: "今天的節奏不必太快，確認細節能替你避開後續重工。", focus: "送出訊息、文件或款項前，多看一次名稱、日期與數字。" },
  { title: "主動連結", summary: "今天的人際能量不錯，主動開口容易得到有用的回應。", focus: "卡住時及早同步，不要等問題累積後才處理。" },
  { title: "整理優先", summary: "今天適合收斂雜訊、整理待辦，清楚的順序會帶來好狀態。", focus: "先分清楚立即、重要與可延後，避免被臨時事項牽著走。" },
  { title: "保持彈性", summary: "今天可能出現計畫外的小變化，留下緩衝就能從容應對。", focus: "行程不要排得太滿，重要安排預留至少十五分鐘。" },
];

const fortuneAdvice = [
  "溝通時先確認彼此對完成標準的理解一致。",
  "避免在疲累時做不可逆或金額較大的決定。",
  "今天容易忽略小細節，送出前請再檢查一次。",
  "別把所有事情都自己扛，適時請同事一起確認。",
  "遇到不同意見先聽完，再決定是否需要立即回應。",
  "注意久坐與用眼時間，中午前後安排短暫伸展。",
];

const cosmicMessages = [
  "宇宙今天不催你，但它希望你別再拖那件五分鐘就能完成的小事。",
  "你不需要一次看見整條路，先把下一步走漂亮就夠了。",
  "今天的好運藏在一次主動開口、一次耐心確認，和一杯剛剛好的飲料裡。",
  "別急著證明自己是對的，讓結果替你說話會更有力量。",
  "某個看似普通的回覆，可能正是今天故事轉彎的地方。",
  "今天適合相信直覺，但簽名、金額與日期還是要相信第二次檢查。",
];

const dailyMissions = [
  "在中午前完成一件拖了兩天以上的小任務。",
  "主動稱讚一位同事，而且要說出具體原因。",
  "整理桌面或電腦下載資料夾十分鐘，替好運清出空間。",
  "把今天最重要的事寫成一句話，完成前先不新增待辦。",
  "下午三點前喝完一杯水，起身走動三分鐘。",
  "傳一則簡短訊息，向最近幫過你的人說聲謝謝。",
];

const zodiacSigns = [
  { name: "摩羯座", icon: "♑", from: 1222, to: 119, element: "土象" },
  { name: "水瓶座", icon: "♒", from: 120, to: 218, element: "風象" },
  { name: "雙魚座", icon: "♓", from: 219, to: 320, element: "水象" },
  { name: "牡羊座", icon: "♈", from: 321, to: 419, element: "火象" },
  { name: "金牛座", icon: "♉", from: 420, to: 520, element: "土象" },
  { name: "雙子座", icon: "♊", from: 521, to: 621, element: "風象" },
  { name: "巨蟹座", icon: "♋", from: 622, to: 722, element: "水象" },
  { name: "獅子座", icon: "♌", from: 723, to: 822, element: "火象" },
  { name: "處女座", icon: "♍", from: 823, to: 922, element: "土象" },
  { name: "天秤座", icon: "♎", from: 923, to: 1023, element: "風象" },
  { name: "天蠍座", icon: "♏", from: 1024, to: 1122, element: "水象" },
  { name: "射手座", icon: "♐", from: 1123, to: 1221, element: "火象" },
];

function zodiacFor(birthday: string | null) {
  if (!birthday) return { name: "神秘星座", icon: "✦", element: "等待解鎖" };
  const [month, day] = birthday.split("-").map(Number);
  const value = month * 100 + day;
  return zodiacSigns.find((sign) =>
    sign.from > sign.to ? value >= sign.from || value <= sign.to : value >= sign.from && value <= sign.to,
  ) ?? { name: "神秘星座", icon: "✦", element: "等待解鎖" };
}

function dailySeed(value: string) {
  let seed = 0;
  for (const character of value) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  return seed;
}

function taipeiToday() {
  const date = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  const weekday = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", weekday: "long" }).format(date);
  return {
    key: `${parts.year}-${parts.month}-${parts.day}`,
    topbar: `${parts.year} 年 ${Number(parts.month)} 月 ${Number(parts.day)} 日・${weekday}`,
    fortune: `${Number(parts.month)} 月 ${Number(parts.day)} 日・${weekday}`,
  };
}

function birthdayText(birthday: string | null) {
  if (!birthday) return "收集中";
  const [month, day] = birthday.split("-").map(Number);
  return `${month} 月 ${day} 日`;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedInRole, setLoggedInRole] = useState<Member["role"]>("一般成員");
  const [view, setView] = useState<View>("dashboard");
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeLoginField, setActiveLoginField] = useState<"email" | "password" | null>(null);
  const [rememberAccount, setRememberAccount] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [members, setMembers] = useState(initialMembers);
  const [organizationPeople, setOrganizationPeople] = useState(initialOrganizationPeople);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberEmail, setEditMemberEmail] = useState("");
  const [editMemberRole, setEditMemberRole] = useState<Member["role"]>("一般成員");
  const [selectedOrgPerson, setSelectedOrgPerson] = useState<OrgPerson | null>(null);
  const [saved, setSaved] = useState("");
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [toast, setToast] = useState("");
  const visibleServices = useMemo(
    () => services.filter((service) => permissions[user]?.[service.id] ?? true),
    [permissions, user],
  );
  const profileName = user || "使用者";
  const profile = userProfiles[user] ?? {
    english: profileName[0].toUpperCase() + profileName.slice(1),
    name: members.find((member) => member.email === email)?.name ?? profileName,
    department: "Aizen",
    title: "一般成員",
  };
  const isAdmin = loggedInRole === "管理員";
  const currentDay = taipeiToday();
  const signedInMember = members.find((member) => member.email === email);
  const signedInOrgPerson = organizationPeople.find(
    (person) => person.email === email || signedInMember?.name.startsWith(`${person.english} `),
  );
  const zodiac = zodiacFor(signedInOrgPerson?.birthday ?? null);
  const fortune = useMemo(() => {
    const dayKey = currentDay.key;
    const fortuneIdentity = signedInOrgPerson?.birthday ?? email;
    const seed = dailySeed(`${fortuneIdentity}:${dayKey}`);
    const theme = fortuneThemes[seed % fortuneThemes.length];
    return {
      ...theme,
      date: currentDay.fortune,
      overall: 68 + seed % 27,
      work: 60 + (seed >>> 3) % 36,
      people: 60 + (seed >>> 7) % 36,
      finance: 60 + (seed >>> 11) % 36,
      advice: fortuneAdvice[(seed >>> 5) % fortuneAdvice.length],
      color: ["天空藍", "森林綠", "暖橘色", "米白色", "深海藍"][seed % 5],
      number: seed % 9 + 1,
      bestTime: ["09:30–11:00", "10:00–11:30", "13:30–15:00", "15:00–16:30", "16:00–17:30"][seed % 5],
      basis: signedInOrgPerson?.birthday ? "生日運勢・輕鬆參考" : "生日收集中・暫以帳號生成",
      keyword: ["果斷", "細心", "連結", "整理", "彈性", "勇氣"][(seed >>> 2) % 6],
      avoid: ["衝動回覆", "忘記存檔", "過度承諾", "空腹開會", "最後一刻", "想太多"][(seed >>> 6) % 6],
      message: cosmicMessages[(seed >>> 9) % cosmicMessages.length],
      mission: dailyMissions[(seed >>> 13) % dailyMissions.length],
      goodFor: ["整理提案", "主動溝通", "處理數字", "安排新計畫", "收尾舊任務", "認識新夥伴"][(seed >>> 15) % 6],
      recharge: ["無糖茶", "散步十分鐘", "喜歡的音樂", "曬一下太陽", "清爽水果", "深呼吸五次"][(seed >>> 18) % 6],
      socialCode: ["先聽再說", "直接但溫柔", "多問一句", "記得回覆", "保持幽默", "給彼此空間"][(seed >>> 21) % 6],
    };
  }, [email, currentDay.key, currentDay.fortune, signedInOrgPerson?.birthday]);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) return setPasswordError("新密碼至少需要 8 個字元。");
    if (newPassword !== confirmPassword) return setPasswordError("兩次輸入的新密碼不一致。");
    setPasswordBusy(true);
    try {
      const response = await fetch("/api/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) return setPasswordError(result?.error || "密碼更新失敗。");
      setPassword(newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("密碼已更新，下次登入請使用新密碼");
    } catch {
      setPasswordError("目前無法更新密碼，請稍後再試。");
    } finally {
      setPasswordBusy(false);
    }
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadSharedState = async (accessToken: string) => {
    const response = await fetch("/api/control-state", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return;
    const data = await response.json() as {
      members: Array<Member & { active: number | boolean }>;
      permissions: Array<{ email: string; leave: number | boolean; claims: number | boolean; instructors: number | boolean }>;
      organization: Array<OrgPerson & { level: number }>;
    };
    const memberList = data.members.map((member) => ({ ...member, active: Boolean(member.active) }));
    const permissionsByEmail = new Map(data.permissions.map((item) => [item.email, item]));
    setMembers(memberList);
    if (data.organization?.length) {
      setOrganizationPeople(data.organization.map((person) => ({ ...person, level: person.level as 1 | 2 | 3 })));
    }
    setPermissions(Object.fromEntries(memberList.map((member) => {
      const item = permissionsByEmail.get(member.email);
      return [adminEmails[member.email] ?? member.email.split("@")[0], {
        leave: item ? Boolean(item.leave) : true,
        claims: item ? Boolean(item.claims) : true,
        instructors: item ? Boolean(item.instructors) : true,
      }];
    })));
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setLoginError("");
    setLoginBusy(true);
    try {
      const response = await fetch("/api/war-room-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        setLoginError(result?.error || "帳號或密碼不正確，或此信箱未開放。");
        return;
      }
      const data = await response.json() as { token: string; name: string; role: Member["role"] };
      setToken(data.token);
      setLoggedInRole(data.role);
      setUser(adminEmails[normalizedEmail] ?? normalizedEmail.split("@")[0]);
      await loadSharedState(data.token);
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      if (returnTo === "leave" || returnTo === "claims" || returnTo === "instructors") {
        window.location.assign(`/api/launch?service=${returnTo}`);
        return;
      }
      setLoggedIn(true);
      setView("dashboard");
      notify(`歡迎回來，${data.name}`);
    } catch {
      setLoginError("目前無法連線到登入服務，請稍後再試。");
    } finally {
      setLoginBusy(false);
    }
  };

  const openService = (service: (typeof services)[number]) => {
    window.open(`/api/launch?service=${service.id}`, "_blank", "noopener,noreferrer");
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = newMemberEmail.trim().toLowerCase();
    const normalizedName = newMemberName.trim();
    if (!normalizedName || !normalizedEmail || members.some((member) => member.email === normalizedEmail)) {
      notify("請輸入尚未加入的有效姓名與信箱");
      return;
    }
    const response = await fetch("/api/control-state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "add", email: normalizedEmail, name: normalizedName }),
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) return notify(result?.error || "新增人員失敗");
    await loadSharedState(token);
    setNewMemberName("");
    setNewMemberEmail("");
    notify(`已允許 ${normalizedEmail} 登入`);
  };

  const startEditingMember = (member: Member) => {
    setEditingEmail(member.email);
    setEditMemberName(member.name);
    setEditMemberEmail(member.email);
    setEditMemberRole(member.role);
  };

  const saveMember = async (member: Member) => {
    const normalizedName = editMemberName.trim();
    const normalizedEmail = editMemberEmail.trim().toLowerCase();
    if (!normalizedName || !normalizedEmail) return notify("姓名與公司信箱不可空白");
    const response = await fetch("/api/control-state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "edit",
        email: member.email,
        newEmail: normalizedEmail,
        name: normalizedName,
        role: editMemberRole,
      }),
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) return notify(result?.error || "人員資料更新失敗");
    if (email === member.email) setEmail(normalizedEmail);
    setEditingEmail("");
    await loadSharedState(token);
    notify(`已更新 ${normalizedName} 的資料`);
  };

  const organizationMember = (person: OrgPerson) =>
    members.find((member) => member.email === person.email || member.name.startsWith(`${person.english} `));

  const permissionMember = (permissionKey: string) => {
    const permissionEmail = Object.entries(adminEmails).find(([, key]) => key === permissionKey)?.[0]
      ?? `${permissionKey}@ai-zens.com`;
    return members.find((member) => member.email === permissionEmail);
  };

  const savePermissions = async () => {
    setPermissionBusy(true);
    try {
      const responses = await Promise.all(Object.entries(permissions).map(([name, access]) => {
        const member = permissionMember(name);
        if (!member) throw new Error(`找不到 ${name} 的登入名單資料`);
        return fetch("/api/control-state", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "permissions", email: member.email, permissions: access }),
        });
      }));
      const failed = responses.find((response) => !response.ok);
      if (failed) {
        const result = await failed.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "部分權限未能儲存");
      }
      await loadSharedState(token);
      setSaved(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
      notify("共享權限設定已儲存");
    } catch (error) {
      notify(error instanceof Error ? error.message : "權限儲存失敗，請再試一次");
    } finally {
      setPermissionBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/war-room-session", { method: "DELETE" }).catch(() => null);
    setLoggedIn(false);
    setToken("");
    setPassword("");
  };

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const response = await fetch("/api/war-room-session", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = await response.json() as { email: string; name: string; role: Member["role"] };
        const normalizedEmail = data.email.toLowerCase();
        setEmail(normalizedEmail);
        setLoggedInRole(data.role);
        setUser(adminEmails[normalizedEmail] ?? normalizedEmail.split("@")[0]);
        await loadSharedState("");
        if (!cancelled) setLoggedIn(true);
      } catch {
        // 沒有有效的一日登入憑證時，維持顯示登入頁。
      }
    };
    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  if (!loggedIn) {
    return (
      <main className="login-page">
        <section className="login-brand" aria-label="Aizen 戰情室介紹">
          <img className="brand-logo large" src="/aizen-mark.png" alt="Aizen" />
          <div className="brand-copy">
            <span>AIZEN OPERATIONS</span>
            <h1>讓每一項行政作業，<br />都在掌握之中。</h1>
            <p>集中管理日常業務、簽核進度與團隊權限。從一個入口，快速抵達需要的工作。</p>
          </div>
          <div className="brand-foot">
            <span className="pulse-dot" />
            系統服務正常
          </div>
        </section>

        <section className="login-panel">
          <form className="login-card" onSubmit={login} autoComplete="off">
            <div className="mobile-logo"><img className="brand-logo" src="/aizen-mark.png" alt="" />AIZEN</div>
            <p className="kicker">WELCOME BACK</p>
            <h2>登入戰情室</h2>
            <p className="muted">請使用您的公司信箱繼續</p>
            {loginError && <div className="login-error" role="alert">{loginError}</div>}

            <label htmlFor="account">公司信箱</label>
            <div className="field">
              <span className="field-icon email-field-icon" aria-hidden="true" />
              <input id="account" name="war-room-email" type="email" inputMode="email" autoComplete="off" data-lpignore="true" data-1p-ignore="true" readOnly={activeLoginField !== "email"} list="demo-emails" value={email} onPointerDown={() => setActiveLoginField("email")} onFocus={() => setActiveLoginField("email")} onChange={(e) => setEmail(e.target.value)} placeholder="name@ai-zens.com" required />
              <datalist id="demo-emails">
                <option value="maggiefang@ai-zens.com" />
                <option value="ritahsieh@ai-zens.com" />
                <option value="jerrychang@ai-zens.com" />
              </datalist>
            </div>

            <label htmlFor="password">密碼</label>
            <div className="field">
              <span className="field-icon lock-field-icon" aria-hidden="true" />
              <input id="password" name="war-room-access-key" type={showPassword ? "text" : "password"} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" readOnly={activeLoginField !== "password"} value={password} onPointerDown={() => setActiveLoginField("password")} onFocus={() => setActiveLoginField("password")} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label="顯示或隱藏密碼">
                {showPassword ? "隱藏" : "顯示"}
              </button>
            </div>

            <div className="login-options">
              <label className="remember"><input type="checkbox" name="war-room-remember" autoComplete="off" checked={rememberAccount} onChange={(event) => setRememberAccount(event.target.checked)} /> 記住我的帳號</label>
              <button type="button" className="text-button">忘記密碼？</button>
            </div>

            <button className="primary-button" type="submit" disabled={loginBusy}>{loginBusy ? "登入中…" : "進入戰情室"} <span>→</span></button>
            <p className="demo-hint">多人共用版本；初次登入預設密碼為 Ab123456</p>
          </form>
          <footer>© 2026 Aizen. Internal use only.</footer>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="side-brand" onClick={() => setView("dashboard")}><img className="brand-logo" src="/aizen-mark.png" alt="" /><b>AIZEN</b></button>
        <nav aria-label="主選單">
          <p>工作台</p>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><span>▦</span>戰情室總覽</button>
          <button className={view === "fortune" ? "active" : ""} onClick={() => setView("fortune")}><span>☀</span>今日運勢</button>
          <p>帳號設定</p>
          <button className={view === "password" ? "active" : ""} onClick={() => setView("password")}><span>⌁</span>修改登入密碼</button>
          {isAdmin && <button className={view === "permissions" ? "active" : ""} onClick={() => setView("permissions")}><span>♙</span>頁面權限管控</button>}
          <button className={view === "people" ? "active" : ""} onClick={() => setView("people")}><span>♧</span>公司組織圖</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip">
            <div className="avatar">{profile.name[0]}</div>
            <div><b>{profile.name}</b><span>{profile.title}</span></div>
          </div>
          <button className="logout" onClick={() => void logout()} aria-label="登出">↪</button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">AIZEN / {view === "dashboard" ? "戰情室總覽" : view === "fortune" ? "今日運勢" : view === "password" ? "修改登入密碼" : view === "permissions" ? "頁面權限管控" : "公司組織圖"}</p>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="通知">♢<i /></button>
            <span className="date">{currentDay.topbar}</span>
          </div>
        </header>

        {view === "dashboard" && (
          <div className="page dashboard">
            <div className="page-heading">
              <div><p className="kicker">COMMAND CENTER</p><h1>早安，{profile.english}</h1><p>今天也一起把重要的事，穩穩推進。</p></div>
              <div className="status-pill"><span className="pulse-dot" />所有系統運作正常</div>
            </div>

            <section className="overview-strip">
              <div><span>今日待辦</span><b>18</b><small>項工作</small></div>
              <div><span>等待簽核</span><b>06</b><small>筆申請</small></div>
              <div><span>本月完成</span><b>142</b><small>項作業</small></div>
              <div className="progress-block"><span>本月作業完成率</span><b>78%</b><div className="progress"><i /></div></div>
            </section>

            <div className="section-title"><div><h2>業務系統</h2><p>選擇要前往的工作區</p></div><span>{visibleServices.length} 個可用系統</span></div>
            <section className="service-grid">
              {visibleServices.map((service) => (
                <article className="service-card" key={service.id}>
                  <div className="service-icon" style={{ background: service.color }}>{service.icon}</div>
                  <div className="service-meta">
                    <span>{service.eyebrow}</span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                  <div className="service-footer">
                    <div><b>{service.metric}</b><span>{service.metricLabel}</span></div>
                    <button onClick={() => openService(service)}>開啟正式系統 <span>↗</span></button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}

        {view === "fortune" && (
          <div className="page fortune-page">
            <div className="page-heading">
              <div><p className="kicker">DAILY FORTUNE</p><h1>今日運勢</h1><p>{fortune.date}・給自己一個清楚、從容的工作節奏。</p></div>
              <span className="fortune-disclaimer">{fortune.basis}</span>
            </div>
            <section className="fortune-hero">
              <div className="fortune-score"><span>今日整體運勢</span><div className="fortune-score-value"><strong>{fortune.overall}</strong><small>/ 100</small></div></div>
              <div className="fortune-summary">
                <div className="zodiac-badge"><b>{zodiac.icon}</b><span>{zodiac.name}<small>{zodiac.element}・今日關鍵字：{fortune.keyword}</small></span></div>
                <span>TODAY&apos;S THEME</span><h2>{fortune.title}</h2><p>{fortune.summary}</p>
              </div>
              <div className="fortune-orbit"><i /><b>{zodiac.icon}</b><span>{zodiac.name}</span></div>
            </section>
            <section className="fortune-chips" aria-label="今日能量提示">
              <div><span>✓ 今日宜</span><strong>{fortune.goodFor}</strong></div>
              <div><span>☕ 能量補給</span><strong>{fortune.recharge}</strong></div>
              <div><span>⌁ 社交暗號</span><strong>{fortune.socialCode}</strong></div>
            </section>
            <section className="fortune-metrics">
              {[
                ["工作運", fortune.work, "先完成最重要的一步"],
                ["人際運", fortune.people, "清楚表達也記得傾聽"],
                ["財務運", fortune.finance, "支出與數字多確認一次"],
              ].map(([label, score, note]) => (
                <article key={String(label)}>
                  <div><span>{label}</span><strong>{score}</strong></div>
                  <div className="fortune-bar"><i style={{ width: `${score}%` }} /></div>
                  <p>{note}</p>
                </article>
              ))}
            </section>
            <section className="fortune-guidance">
              <article className="attention-card">
                <span>今天該注意什麼</span>
                <h2>{fortune.advice}</h2>
                <p>{fortune.focus}</p>
              </article>
              <article className="lucky-card">
                <span>今日幸運提示</span>
                <dl>
                  <div><dt>幸運色</dt><dd>{fortune.color}</dd></div>
                  <div><dt>幸運數字</dt><dd>{fortune.number}</dd></div>
                  <div><dt>順勢時段</dt><dd>{fortune.bestTime}</dd></div>
                </dl>
              </article>
            </section>
            <section className="cosmic-grid">
              <article className="mission-card">
                <div className="cosmic-icon">✓</div>
                <div><span>TODAY&apos;S QUEST</span><h2>今日小任務</h2><p>{fortune.mission}</p></div>
              </article>
              <article className="warning-card">
                <div className="cosmic-icon">!</div>
                <div><span>COSMIC RADAR</span><h2>今日避雷</h2><p>{fortune.avoid}</p></div>
              </article>
              <article className="whisper-card">
                <span>✦ 宇宙悄悄話</span>
                <blockquote>「{fortune.message}」</blockquote>
              </article>
            </section>
          </div>
        )}

        {view === "password" && (
          <div className="page narrow-page">
            <div className="page-heading"><div><p className="kicker">ACCOUNT SECURITY</p><h1>修改登入密碼</h1><p>定期更新密碼，讓帳號維持安全。</p></div></div>
            <form className="settings-card" onSubmit={changePassword}>
              <div className="settings-icon">⌁</div>
              <div className="form-copy"><h2>{profile.english}・{profile.name}</h2><p>{profile.department}・{profile.title}　／　{email}</p></div>
              {passwordError && <div className="password-error" role="alert">{passwordError}</div>}
              <label>目前密碼<input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
              <label>新密碼<input type="password" required minLength={8} autoComplete="new-password" placeholder="至少 8 個字元" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
              <label>確認新密碼<input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setView("dashboard")}>取消</button><button className="primary-button save-button" disabled={passwordBusy}>{passwordBusy ? "更新中…" : "儲存新密碼"}</button></div>
            </form>
          </div>
        )}

        {view === "permissions" && (
          <div className="page">
            <div className="page-heading"><div><p className="kicker">ACCESS CONTROL</p><h1>頁面權限管控</h1><p>設定管理者可進入的業務系統。</p></div><button className="primary-button save-button" disabled={permissionBusy} onClick={() => void savePermissions()}>{permissionBusy ? "儲存中…" : "儲存變更"}</button></div>
            <section className="permission-card">
              <div className="permission-head">
                <div><h2>管理者頁面存取權</h2><p>勾選代表該帳號登入後可以看到並進入此系統。</p></div>
                {saved && <span>最近儲存：{saved}</span>}
              </div>
              <div className="permission-table">
                <div className="permission-row table-labels"><span>管理者</span>{services.map(s => <span key={s.id}>{s.title}</span>)}<span>權限數</span></div>
                {Object.keys(permissions).map((name) => {
                  const count = Object.values(permissions[name]).filter(Boolean).length;
                  const member = permissionMember(name);
                  const displayName = member?.name ?? name[0].toUpperCase() + name.slice(1);
                  return (
                    <div className="permission-row" key={name}>
                      <span className="admin-name"><i>{displayName[0].toUpperCase()}</i><b>{displayName}</b><small>{member?.role ?? "系統管理員"}</small></span>
                      {services.map((service) => (
                        <label className="switch" key={service.id}>
                          <input type="checkbox" checked={permissions[name][service.id]} onChange={() => setPermissions(prev => ({ ...prev, [name]: { ...prev[name], [service.id]: !prev[name][service.id] } }))} />
                          <span />
                        </label>
                      ))}
                      <span className="count-badge">{count} / 3</span>
                    </div>
                  );
                })}
              </div>
              <div className="permission-note"><b>提示</b><span>權限關閉後，該業務卡片會從使用者的戰情室隱藏；儲存後會同步套用到其他人的登入畫面。</span></div>
            </section>
          </div>
        )}

        {view === "people" && (
          <div className="page">
            <div className="page-heading">
              <div><p className="kicker">COMPANY ORGANIZATION</p><h1>公司組織圖</h1><p>查看公司部門、人員職稱與聯絡方式。</p></div>
              <span className="member-total">共 {organizationPeople.length} 位夥伴</span>
            </div>
            <section className="organization-chart">
              <div className="organization-leader">
                {organizationPeople.filter((person) => person.level === 1).map((person) => {
                  const member = organizationMember(person);
                  return <button type="button" className="organization-person featured" key={person.id} onClick={() => setSelectedOrgPerson(person)}><b>{member?.name ?? `${person.english} ${person.name}`}</b><span>{person.title}</span><small>查看聯絡資訊</small></button>;
                })}
              </div>
              <div className="organization-trunk" />
              <div className="organization-departments">
                {["技術部", "設計部", "業務部", "行銷部", "企劃部"].map((department) => {
                  const departmentPeople = organizationPeople.filter((person) => person.department === department);
                  return (
                    <section className="organization-department" key={department}>
                      <div className="organization-branch" />
                      <header><h2>{department}</h2><span>{departmentPeople.length} 人</span></header>
                      <div>
                        {departmentPeople.map((person) => {
                          const member = organizationMember(person);
                          return <button type="button" className="organization-person" key={person.id} onClick={() => setSelectedOrgPerson(person)}><b>{member?.name ?? `${person.english} ${person.name}`}</b><span>{person.title}</span><small>查看</small></button>;
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            {isAdmin && <section className="organization-admin">
              <div className="section-title"><div><h2>人員與登入管理</h2><p>新增、編輯或停用可登入戰情室的公司成員。</p></div><span>{members.filter((member) => member.active).length} 位可登入</span></div>
              <section className="people-layout">
              <form className="invite-card" onSubmit={addMember}>
                <span className="invite-icon">＋</span>
                <div><h2>新增可存取人員</h2><p>輸入姓名及已存在於正式系統的公司信箱，加入後即可登入戰情室。</p></div>
                <label htmlFor="new-member-name">姓名</label>
                <input id="new-member-name" type="text" value={newMemberName} onChange={(event) => setNewMemberName(event.target.value)} placeholder="例如：Emily 張芷瑄" required />
                <label htmlFor="new-member-email">公司信箱</label>
                <input id="new-member-email" type="email" value={newMemberEmail} onChange={(event) => setNewMemberEmail(event.target.value)} placeholder="name@ai-zens.com" required />
                <button className="primary-button" type="submit">加入允許名單</button>
              </form>

              <section className="member-card">
                <div className="permission-head">
                  <div><h2>允許登入名單</h2><p>停用後該信箱將無法登入；管理員帳號不可移除。</p></div>
                  <span>共 {members.length} 人</span>
                </div>
                <div className="member-list">
                  {members.map((member) => (
                    <div className="member-row" key={member.email}>
                      <span className="member-avatar">{member.name[0].toUpperCase()}</span>
                      {editingEmail === member.email ? (
                        <span className="member-identity editing">
                          <input aria-label={`${member.name} 姓名`} value={editMemberName} onChange={(event) => setEditMemberName(event.target.value)} />
                          <input aria-label={`${member.name} 公司信箱`} type="email" value={editMemberEmail} onChange={(event) => setEditMemberEmail(event.target.value)} />
                        </span>
                      ) : (
                        <span className="member-identity"><b>{member.name}</b><small>{member.email}</small></span>
                      )}
                      {editingEmail === member.email ? (
                        <select
                          className="role-select"
                          aria-label={`${member.name} 系統角色`}
                          value={editMemberRole}
                          onChange={(event) => setEditMemberRole(event.target.value as Member["role"])}
                        >
                          <option value="一般成員">一般成員</option>
                          <option value="管理員">管理員</option>
                        </select>
                      ) : (
                        <span className={`role-badge ${member.role === "管理員" ? "admin" : ""}`}>{member.role}</span>
                      )}
                      <label className="switch access-switch" aria-label={`${member.email} 登入權限`}>
                          <input type="checkbox" checked={member.active} onChange={async () => {
                            await fetch("/api/control-state", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "toggle", email: member.email, active: !member.active }) });
                            await loadSharedState(token);
                          }} />
                        <span />
                      </label>
                      <span className={`access-status ${member.active ? "enabled" : ""}`}>{member.active ? "可登入" : "已停用"}</span>
                      {editingEmail === member.email ? (
                        <span className="member-edit-actions">
                          <button type="button" onClick={() => saveMember(member)}>儲存</button>
                          <button type="button" onClick={() => setEditingEmail("")}>取消</button>
                        </span>
                      ) : (
                        <button className="edit-member" type="button" onClick={() => startEditingMember(member)}>編輯</button>
                      )}
                      <button
                        className="remove-member"
                        type="button"
                        disabled={member.role === "管理員"}
                        onClick={async () => {
                          await fetch("/api/control-state", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "remove", email: member.email }) });
                          await loadSharedState(token);
                          notify(`已移除 ${member.email}`);
                        }}
                      >
                        {member.role === "管理員" ? "受保護" : "移除"}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="permission-note"><b>共享資料</b><span>名單與權限會同步儲存，其他使用者重新登入後即可看到最新設定。</span></div>
              </section>
              </section>
            </section>}
          </div>
        )}
      </section>
      {selectedOrgPerson && (
        <div className="organization-modal-backdrop" onMouseDown={() => setSelectedOrgPerson(null)}>
          <section className="organization-modal" role="dialog" aria-modal="true" aria-label={`${selectedOrgPerson.english} 的聯絡資訊`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="organization-modal-close" type="button" aria-label="關閉" onClick={() => setSelectedOrgPerson(null)}>×</button>
            <p className="kicker">{selectedOrgPerson.department}</p>
            <h2>{organizationMember(selectedOrgPerson)?.name ?? `${selectedOrgPerson.english} ${selectedOrgPerson.name}`}</h2>
            <p>{selectedOrgPerson.title}</p>
            <dl>
              <div><dt>公司信箱</dt><dd><a href={`mailto:${organizationMember(selectedOrgPerson)?.email ?? selectedOrgPerson.email}`}>{organizationMember(selectedOrgPerson)?.email ?? selectedOrgPerson.email}</a></dd></div>
              <div><dt>聯絡手機</dt><dd><a href={`tel:${selectedOrgPerson.phone}`}>{selectedOrgPerson.phone}</a></dd></div>
              <div><dt>生日</dt><dd className={selectedOrgPerson.birthday ? "" : "collecting"}>{birthdayText(selectedOrgPerson.birthday)}</dd></div>
            </dl>
            <button className="primary-button" type="button" onClick={() => setSelectedOrgPerson(null)}>關閉</button>
          </section>
        </div>
      )}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}
