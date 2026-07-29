"use client";

import { FormEvent, useMemo, useState } from "react";

type View = "dashboard" | "password" | "permissions";
type ServiceId = "leave" | "claims" | "instructors";

const services: Array<{
  id: ServiceId;
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  color: string;
  icon: string;
}> = [
  {
    id: "leave",
    eyebrow: "人事作業",
    title: "請假系統",
    description: "假單申請、簽核進度與年度假別餘額",
    metric: "06",
    metricLabel: "待簽核",
    color: "#5968d8",
    icon: "休",
  },
  {
    id: "claims",
    eyebrow: "財務作業",
    title: "請款系統",
    description: "費用申請、單據核銷與付款進度追蹤",
    metric: "12",
    metricLabel: "處理中",
    color: "#cf713e",
    icon: "款",
  },
  {
    id: "instructors",
    eyebrow: "教務營運",
    title: "講師看板",
    description: "講師排程、授課時數與合作狀態總覽",
    metric: "28",
    metricLabel: "本月場次",
    color: "#2e8b78",
    icon: "講",
  },
];

const initialPermissions: Record<string, Record<ServiceId, boolean>> = {
  maggie: { leave: true, claims: true, instructors: true },
  rita: { leave: true, claims: true, instructors: false },
  jerry: { leave: false, claims: true, instructors: true },
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [user, setUser] = useState("maggie");
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [saved, setSaved] = useState("");
  const [toast, setToast] = useState("");
  const visibleServices = useMemo(
    () => services.filter((service) => permissions[user]?.[service.id] ?? true),
    [permissions, user],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const login = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggedIn(true);
    setView("dashboard");
    notify(`歡迎回來，${user[0].toUpperCase()}${user.slice(1)}`);
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
            <p className="muted">請使用您的 Aizen 帳號繼續</p>

            <label htmlFor="account">登入帳號</label>
            <div className="field">
              <span>◎</span>
              <select id="account" value={user} onChange={(e) => setUser(e.target.value)}>
                <option value="maggie">maggie</option>
                <option value="rita">rita</option>
                <option value="jerry">jerry</option>
              </select>
            </div>

            <label htmlFor="password">密碼</label>
            <div className="field">
              <span>⌑</span>
              <input id="password" type={showPassword ? "text" : "password"} defaultValue="aizen2026" />
              <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label="顯示或隱藏密碼">
                {showPassword ? "隱藏" : "顯示"}
              </button>
            </div>

            <div className="login-options">
              <label className="remember"><input type="checkbox" defaultChecked /> 記住我的帳號</label>
              <button type="button" className="text-button">忘記密碼？</button>
            </div>

            <button className="primary-button" type="submit">進入戰情室 <span>→</span></button>
            <p className="demo-hint">測試版：選擇任一帳號即可登入</p>
          </form>
          <footer>© 2026 Aizen. Internal use only.</footer>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="side-brand" onClick={() => setView("dashboard")}><span className="brand-mark">A</span><b>AIZEN</b></button>
        <nav aria-label="主選單">
          <p>工作台</p>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><span>▦</span>戰情室總覽</button>
          <p>帳號設定</p>
          <button className={view === "password" ? "active" : ""} onClick={() => setView("password")}><span>⌁</span>修改登入密碼</button>
          <button className={view === "permissions" ? "active" : ""} onClick={() => setView("permissions")}><span>♙</span>頁面權限管控</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip">
            <div className="avatar">{user[0].toUpperCase()}</div>
            <div><b>{user[0].toUpperCase() + user.slice(1)}</b><span>系統管理員</span></div>
          </div>
          <button className="logout" onClick={() => setLoggedIn(false)} aria-label="登出">↪</button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">AIZEN / {view === "dashboard" ? "戰情室總覽" : view === "password" ? "修改登入密碼" : "頁面權限管控"}</p>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="通知">♢<i /></button>
            <span className="date">2026 年 7 月 29 日・星期三</span>
          </div>
        </header>

        {view === "dashboard" && (
          <div className="page dashboard">
            <div className="page-heading">
              <div><p className="kicker">COMMAND CENTER</p><h1>早安，{user[0].toUpperCase() + user.slice(1)}</h1><p>今天也一起把重要的事，穩穩推進。</p></div>
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
                    <button onClick={() => notify(`${service.title}為測試入口，尚未連接正式系統`)}>開啟系統 <span>↗</span></button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}

        {view === "password" && (
          <div className="page narrow-page">
            <div className="page-heading"><div><p className="kicker">ACCOUNT SECURITY</p><h1>修改登入密碼</h1><p>定期更新密碼，讓帳號維持安全。</p></div></div>
            <form className="settings-card" onSubmit={(e) => { e.preventDefault(); notify("測試版已模擬更新密碼"); }}>
              <div className="settings-icon">⌁</div>
              <div className="form-copy"><h2>設定新密碼</h2><p>新密碼至少需要 8 個字元，並建議包含英文與數字。</p></div>
              <label>目前密碼<input type="password" placeholder="輸入目前密碼" required /></label>
              <label>新密碼<input type="password" placeholder="輸入新密碼" minLength={8} required /></label>
              <label>確認新密碼<input type="password" placeholder="再次輸入新密碼" minLength={8} required /></label>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setView("dashboard")}>取消</button><button className="primary-button">儲存新密碼</button></div>
            </form>
          </div>
        )}

        {view === "permissions" && (
          <div className="page">
            <div className="page-heading"><div><p className="kicker">ACCESS CONTROL</p><h1>頁面權限管控</h1><p>設定管理者可進入的業務系統。</p></div><button className="primary-button save-button" onClick={() => { setSaved(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })); notify("權限設定已儲存"); }}>儲存變更</button></div>
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
      </section>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}
