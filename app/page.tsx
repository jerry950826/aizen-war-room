"use client";

import { FormEvent, useMemo, useState } from "react";

type View = "dashboard" | "password" | "permissions" | "people";
type ServiceId = "leave" | "claims" | "instructors";
type Member = { email: string; name: string; role: "管理員" | "一般成員"; active: boolean };

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
};

const adminEmails: Record<string, string> = {
  "maggiefang@ai-zens.com": "maggie",
  "ritahsieh@ai-zens.com": "rita",
  "jerrychang@ai-zens.com": "jerry",
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
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [user, setUser] = useState("maggie");
  const [email, setEmail] = useState("maggiefang@ai-zens.com");
  const [password, setPassword] = useState("Ab123456");
  const [token, setToken] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [members, setMembers] = useState(initialMembers);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [saved, setSaved] = useState("");
  const [toast, setToast] = useState("");
  const visibleServices = useMemo(
    () => services.filter((service) => permissions[user]?.[service.id] ?? true),
    [permissions, user],
  );
  const profile = userProfiles[user] ?? {
    english: user[0].toUpperCase() + user.slice(1),
    name: members.find((member) => member.email === email)?.name ?? user,
    department: "Aizen",
    title: "一般成員",
  };

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
    };
    setMembers(data.members.map((member) => ({ ...member, active: Boolean(member.active) })));
    setPermissions(Object.fromEntries(data.permissions.map((item) => [
      adminEmails[item.email] ?? item.email.split("@")[0],
      { leave: Boolean(item.leave), claims: Boolean(item.claims), instructors: Boolean(item.instructors) },
    ])));
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
      const data = await response.json() as { token: string; name: string };
      setToken(data.token);
      setUser(adminEmails[normalizedEmail] ?? normalizedEmail.split("@")[0]);
      await loadSharedState(data.token);
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
    if (service.id === "instructors") {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://leaveflow-tw.jerry950826.chatgpt.site/api/dashboard-login";
      form.target = "_blank";
      for (const [name, value] of [["email", email], ["password", password]]) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      form.remove();
      return;
    }
    window.open(`/api/launch?service=${service.id}`, "_blank", "noopener,noreferrer");
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = newMemberEmail.trim().toLowerCase();
    if (!normalizedEmail || members.some((member) => member.email === normalizedEmail)) {
      notify("請輸入尚未加入的有效信箱");
      return;
    }
    const name = normalizedEmail.split("@")[0].replace(/[._-]/g, " ");
    await fetch("/api/control-state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "add", email: normalizedEmail, name: name.replace(/\b\w/g, (letter) => letter.toUpperCase()) }),
    });
    await loadSharedState(token);
    setNewMemberEmail("");
    notify(`已允許 ${normalizedEmail} 登入`);
  };

  if (!loggedIn) {
    return (
      <main className="login-page">
        <section className="login-brand" aria-label="Aizen 戰情室介紹">
          <div className="brand-mark large">A</div>
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
          <form className="login-card" onSubmit={login}>
            <div className="mobile-logo"><div className="brand-mark">A</div>AIZEN</div>
            <p className="kicker">WELCOME BACK</p>
            <h2>登入戰情室</h2>
            <p className="muted">請使用您的公司信箱繼續</p>
            {loginError && <div className="login-error" role="alert">{loginError}</div>}

            <label htmlFor="account">公司信箱</label>
            <div className="field">
              <span>◎</span>
              <input id="account" type="email" list="demo-emails" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@aizen.com" required />
              <datalist id="demo-emails">
                <option value="maggiefang@ai-zens.com" />
                <option value="ritahsieh@ai-zens.com" />
                <option value="jerrychang@ai-zens.com" />
              </datalist>
            </div>

            <label htmlFor="password">密碼</label>
            <div className="field">
              <span>⌑</span>
              <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label="顯示或隱藏密碼">
                {showPassword ? "隱藏" : "顯示"}
              </button>
            </div>

            <div className="login-options">
              <label className="remember"><input type="checkbox" defaultChecked /> 記住我的帳號</label>
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
          <p>帳號設定</p>
          <button className={view === "password" ? "active" : ""} onClick={() => setView("password")}><span>⌁</span>修改登入密碼</button>
          <button className={view === "permissions" ? "active" : ""} onClick={() => setView("permissions")}><span>♙</span>頁面權限管控</button>
          <button className={view === "people" ? "active" : ""} onClick={() => setView("people")}><span>♧</span>人員存取管理</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip">
            <div className="avatar">{profile.name[0]}</div>
            <div><b>{profile.english}・{profile.name}</b><span>{profile.department}・{profile.title}</span></div>
          </div>
          <button className="logout" onClick={() => setLoggedIn(false)} aria-label="登出">↪</button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">AIZEN / {view === "dashboard" ? "戰情室總覽" : view === "password" ? "修改登入密碼" : view === "permissions" ? "頁面權限管控" : "人員存取管理"}</p>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="通知">♢<i /></button>
            <span className="date">2026 年 7 月 29 日・星期三</span>
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
            <div className="page-heading"><div><p className="kicker">ACCESS CONTROL</p><h1>頁面權限管控</h1><p>設定管理者可進入的業務系統。</p></div><button className="primary-button save-button" onClick={async () => {
              await Promise.all(Object.entries(permissions).map(([name, access]) => {
                const adminEmail = Object.entries(adminEmails).find(([, value]) => value === name)?.[0] ?? name;
                return fetch("/api/control-state", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "permissions", email: adminEmail, permissions: access }) });
              }));
              setSaved(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
              notify("共享權限設定已儲存");
            }}>儲存變更</button></div>
            <section className="permission-card">
              <div className="permission-head">
                <div><h2>管理者頁面存取權</h2><p>勾選代表該帳號登入後可以看到並進入此系統。</p></div>
                {saved && <span>最近儲存：{saved}</span>}
              </div>
              <div className="permission-table">
                <div className="permission-row table-labels"><span>管理者</span>{services.map(s => <span key={s.id}>{s.title}</span>)}<span>權限數</span></div>
                {Object.keys(permissions).map((name) => {
                  const count = Object.values(permissions[name]).filter(Boolean).length;
                  return (
                    <div className="permission-row" key={name}>
                      <span className="admin-name"><i>{name[0].toUpperCase()}</i><b>{name[0].toUpperCase() + name.slice(1)}</b><small>系統管理員</small></span>
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
              <div className="permission-note"><b>提示</b><span>權限關閉後，該業務卡片會立即從使用者的戰情室隱藏。這是測試版，重新整理頁面後會還原預設設定。</span></div>
            </section>
          </div>
        )}

        {view === "people" && (
          <div className="page">
            <div className="page-heading">
              <div><p className="kicker">MEMBER ACCESS</p><h1>人員存取管理</h1><p>Maggie、Rita、Jerry 可管理哪些正式公司帳號能進入戰情室。</p></div>
              <span className="member-total">{members.filter((member) => member.active).length} 位可登入</span>
            </div>
            <section className="people-layout">
              <form className="invite-card" onSubmit={addMember}>
                <span className="invite-icon">＋</span>
                <div><h2>新增可存取人員</h2><p>輸入已存在於正式系統的公司信箱，加入後即可登入戰情室。</p></div>
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
                      <span className="member-identity"><b>{member.name}</b><small>{member.email}</small></span>
                      <span className={`role-badge ${member.role === "管理員" ? "admin" : ""}`}>{member.role}</span>
                      <label className="switch access-switch" aria-label={`${member.email} 登入權限`}>
                          <input type="checkbox" checked={member.active} onChange={async () => {
                            await fetch("/api/control-state", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "toggle", email: member.email, active: !member.active }) });
                            await loadSharedState(token);
                          }} />
                        <span />
                      </label>
                      <span className={`access-status ${member.active ? "enabled" : ""}`}>{member.active ? "可登入" : "已停用"}</span>
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
          </div>
        )}
      </section>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}
