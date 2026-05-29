import { useState, useEffect, useCallback } from "react";

// ─── API ──────────────────────────────────────────────────────────────────────
const API_URL = "https://mafia-bet-backend.onrender.com";

async function api(path, options = {}) {
  const token = localStorage.getItem("mafbet_token");
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function adminApi(path, options = {}) {
  const adminKey = localStorage.getItem("mafbet_admin_key") || "";
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return "id" + Math.random().toString(36).slice(2, 9); }

function Toast({ msg, type }) {
  const colors = {
    success: { bg: "#0f2a1a", border: "#2d7a4f", text: "#5dbd88" },
    error:   { bg: "#2a0f0f", border: "#7a2d2d", text: "#bd5d5d" },
    info:    { bg: "#0f1e2a", border: "#2d5a7a", text: "#5d9ebd" },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      background:c.bg, border:`1px solid ${c.border}`, borderRadius:14,
      padding:"11px 20px", fontSize:13, fontWeight:600, color:c.text,
      boxShadow:"0 8px 32px rgba(0,0,0,0.6)", whiteSpace:"nowrap",
      zIndex:3000, animation:"fadeUp .3s ease", maxWidth:"88vw", textAlign:"center",
    }}>{msg}</div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, loading, error }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  function handleSubmit() {
    if (!name.trim()) return;
    // Для тестирования без Telegram — логинимся через форму
    // В реальном Mini App здесь будет window.Telegram.WebApp.initData
    onLogin({ name: name.trim(), username: username.trim() || "@" + name.trim().toLowerCase().replace(/\s/g,"_") });
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center",
      justifyContent:"center", fontFamily:"'DM Sans', sans-serif", padding:20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Bebas+Neue&family=Space+Grotesk:wght@700;800&display=swap" rel="stylesheet" />
      <div style={{ width:"100%", maxWidth:360, textAlign:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue'", fontSize:42, letterSpacing:4, color:"#e8c84a", marginBottom:6 }}>МАФИЯ БЕТ</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", marginBottom:40 }}>Ставки на турниры по мафии</div>

        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:24 }}>
          <div style={{ fontSize:15, fontWeight:600, color:"#fff", marginBottom:20 }}>👤 Войти в игру</div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:6, textAlign:"left", textTransform:"uppercase", letterSpacing:"0.06em" }}>Имя</div>
            <input value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e => e.key==="Enter" && handleSubmit()}
              placeholder="Иван Иванов"
              style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", borderRadius:12,
                border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)",
                color:"#fff", fontSize:15, outline:"none", fontFamily:"'DM Sans'" }} />
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:6, textAlign:"left", textTransform:"uppercase", letterSpacing:"0.06em" }}>Username (необязательно)</div>
            <input value={username} onChange={e=>setUsername(e.target.value)}
              placeholder="@username"
              style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", borderRadius:12,
                border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)",
                color:"#fff", fontSize:15, outline:"none", fontFamily:"'DM Sans'" }} />
          </div>

          {error && <div style={{ fontSize:12, color:"#ff6b6b", marginBottom:12 }}>❌ {error}</div>}

          <button onClick={handleSubmit} disabled={!name.trim() || loading} style={{
            width:"100%", padding:"14px", borderRadius:14, border:"none",
            background: name.trim() ? "linear-gradient(135deg,#e8c84a,#c8822a)" : "rgba(255,255,255,0.06)",
            color: name.trim() ? "#1a1000" : "rgba(255,255,255,0.25)",
            fontSize:15, fontWeight:800, cursor: name.trim()?"pointer":"not-allowed",
            fontFamily:"'Space Grotesk'",
          }}>
            {loading ? "⏳ Входим..." : "🎭 Войти"}
          </button>
        </div>

        <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:16 }}>
          В Telegram Mini App вход автоматический
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER VIEW ──────────────────────────────────────────────────────────────
function PlayerApp({ currentUser, onSwitchAdmin, onLogout, showToast }) {
  const [tab, setTab] = useState("tournaments");
  const [tournaments, setTournaments] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [betModal, setBetModal] = useState(null);
  const [topupModal, setTopupModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(currentUser);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, b, u] = await Promise.all([
        api("/tournaments"),
        api("/me/bets"),
        api("/me"),
      ]);
      setTournaments(t);
      setMyBets(b);
      setUser(u);
    } catch(e) {
      showToast("Ошибка загрузки: " + e.message, "error");
    }
    setLoading(false);
  }

  async function handleConfirmBet(amount) {
    try {
      const res = await api("/bets", {
        method:"POST",
        body: JSON.stringify({
          tournament_id: betModal.tournament.id,
          participant_id: betModal.participant.id,
          amount,
        })
      });
      setUser(u => ({...u, coins: res.new_balance}));
      setBetModal(null);
      showToast(`✅ Ставка принята! Возможный выигрыш: 🪙${res.bet.payout.toLocaleString()}`);
      loadData();
    } catch(e) {
      showToast("❌ " + e.message, "error");
    }
  }

  async function handleTopup(amount, comment) {
    try {
      await api("/topup/request", {
        method:"POST",
        body: JSON.stringify({ amount, comment })
      });
      setTopupModal(false);
      showToast("✅ Запрос отправлен! Ожидайте подтверждения админа.");
    } catch(e) {
      showToast("❌ " + e.message, "error");
    }
  }

  const wonBets = myBets.filter(b => b.tournament_status==="settled" && b.winner_id===b.participant_id);
  const totalWon = wonBets.reduce((s,b) => s+b.payout, 0);

  return (
    <div style={{ minHeight:"100vh", background:"#080810", color:"#fff", maxWidth:480, margin:"0 auto", fontFamily:"'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Bebas+Neue&family=Space+Grotesk:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding:"18px 18px 0", position:"sticky", top:0, zIndex:100, background:"linear-gradient(180deg,#080810 80%,transparent)", backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue'", fontSize:26, letterSpacing:3, color:"#e8c84a", lineHeight:1 }}>МАФИЯ БЕТ</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:2 }}>Привет, {user.name}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setTopupModal(true)} style={{
              background:"rgba(139,195,74,0.12)", border:"1px solid rgba(139,195,74,0.25)",
              borderRadius:10, padding:"7px 10px", color:"#8bc34a", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans'",
            }}>+ Пополнить</button>
            <div style={{ background:"rgba(232,200,74,0.12)", border:"1px solid rgba(232,200,74,0.3)", borderRadius:12, padding:"8px 14px", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:16 }}>🪙</span>
              <span style={{ fontFamily:"'Space Grotesk'", fontSize:17, fontWeight:800, color:"#e8c84a" }}>{(user.coins||0).toLocaleString()}</span>
            </div>
            <button onClick={onSwitchAdmin} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 10px", color:"rgba(255,255,255,0.4)", fontSize:11, cursor:"pointer" }}>⚙️</button>
          </div>
        </div>
        <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:12, padding:3, gap:2, marginBottom:4 }}>
          {[["tournaments","🎭","Турниры"],["mybets","🎯","Ставки"],["profile","👤","Профиль"]].map(([id,ic,lb]) => (
            <button key={id} onClick={() => { setTab(id); if(id==="mybets"||id==="profile") loadData(); }} style={{
              flex:1, padding:"8px 4px", borderRadius:9, border:"none", cursor:"pointer",
              background: tab===id ? "linear-gradient(135deg,#e8c84a,#c8822a)" : "transparent",
              color: tab===id ? "#1a1000" : "rgba(255,255,255,0.4)",
              fontSize:12, fontWeight:700, fontFamily:"'DM Sans'", transition:"all .2s",
            }}>{ic} {lb}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"12px 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize:36, marginBottom:10, animation:"spin 1s linear infinite" }}>🎭</div>
            <div>Загрузка...</div>
          </div>
        ) : tab === "tournaments" ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {tournaments.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.25)" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🎭</div>
                <div>Турниров пока нет</div>
              </div>
            )}
            {tournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} myBets={myBets} onBet={(t,p) => setBetModal({tournament:t,participant:p})} />
            ))}
          </div>
        ) : tab === "mybets" ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {myBets.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.25)" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🎯</div>
                <div>Ставок пока нет</div>
              </div>
            ) : myBets.map(b => <BetRow key={b.id} bet={b} />)}
          </div>
        ) : (
          <PlayerProfile user={user} myBets={myBets} wonBets={wonBets} totalWon={totalWon} onLogout={onLogout} />
        )}
      </div>

      {betModal && (
        <BetModal
          tournament={betModal.tournament} participant={betModal.participant}
          balance={user.coins} onClose={() => setBetModal(null)} onConfirm={handleConfirmBet}
        />
      )}
      {topupModal && <TopupModal onClose={() => setTopupModal(false)} onConfirm={handleTopup} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

function TournamentCard({ tournament, myBets, onBet }) {
  const isSettled = tournament.status === "settled";
  const myBet = myBets.find(b => b.tournament_id === tournament.id);
  const participants = typeof tournament.participants === "string" ? JSON.parse(tournament.participants) : tournament.participants;

  return (
    <div style={{ background:"linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, overflow:"hidden" }}>
      <div style={{ padding:"16px 18px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:17, fontWeight:800, color:"#fff" }}>{tournament.name}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{tournament.description}</div>
          </div>
          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, marginLeft:8, flexShrink:0,
            background: isSettled?"rgba(139,195,74,0.15)":"rgba(232,200,74,0.15)",
            color: isSettled?"#8bc34a":"#e8c84a",
            border:`1px solid ${isSettled?"rgba(139,195,74,0.3)":"rgba(232,200,74,0.3)"}`,
          }}>{isSettled?"✅ Завершён":"🔥 Идёт"}</span>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:8 }}>
          📅 {tournament.ends_at}
          {myBet && <span style={{ marginLeft:12, color:"#e8c84a" }}>✓ Ставка сделана</span>}
        </div>
      </div>
      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {participants.map(p => {
          const isWinner = tournament.winner_id === p.id;
          return (
            <div key={p.id} onClick={() => !isSettled && onBet(tournament, p)}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", borderRadius:12,
                cursor:isSettled?"default":"pointer",
                background:isWinner?"rgba(139,195,74,0.12)":myBet?.participant_id===p.id?"rgba(232,200,74,0.08)":"rgba(255,255,255,0.03)",
                border:`1px solid ${isWinner?"rgba(139,195,74,0.3)":myBet?.participant_id===p.id?"rgba(232,200,74,0.2)":"rgba(255,255,255,0.05)"}`,
                transition:"background .2s",
              }}
              onMouseEnter={e => { if(!isSettled) e.currentTarget.style.background="rgba(232,200,74,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background=isWinner?"rgba(139,195,74,0.12)":myBet?.participant_id===p.id?"rgba(232,200,74,0.08)":"rgba(255,255,255,0.03)"; }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#e8c84a,#c8822a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#1a1000",fontFamily:"'Space Grotesk'",flexShrink:0 }}>{p.avatar||p.name?.slice(0,2)}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>{p.name}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{p.role}</div>
                  {isWinner && <div style={{ fontSize:11, color:"#8bc34a", fontWeight:700 }}>🏆 Победитель</div>}
                </div>
              </div>
              <div style={{ padding:"5px 12px", borderRadius:8, fontFamily:"'Space Grotesk'", fontSize:15, fontWeight:800,
                background:isSettled?"rgba(255,255,255,0.04)":"rgba(232,200,74,0.15)",
                border:`1px solid ${isSettled?"rgba(255,255,255,0.06)":"rgba(232,200,74,0.25)"}`,
                color:isSettled?"rgba(255,255,255,0.3)":"#e8c84a",
              }}>×{parseFloat(p.odds).toFixed(1)}</div>
            </div>
          );
        })}
      </div>
      {!isSettled && <div style={{ textAlign:"center", padding:"0 0 14px", fontSize:11, color:"rgba(255,255,255,0.2)", fontStyle:"italic" }}>Нажми на участника, чтобы поставить</div>}
    </div>
  );
}

function BetRow({ bet }) {
  const won = bet.tournament_status==="settled" && bet.winner_id===bet.participant_id;
  const lost = bet.tournament_status==="settled" && bet.winner_id!==bet.participant_id;
  const sc = won?"#8bc34a":lost?"#e05555":"#e8c84a";
  const label = won?"✅ Выигрыш":lost?"❌ Проигрыш":"⏳ В игре";
  return (
    <div style={{ background:`${sc}0d`, border:`1px solid ${sc}30`, borderRadius:14, padding:"13px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:3 }}>{bet.tournament_name}</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{bet.participant_id}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
            Ставка: <span style={{ color:"#e8c84a" }}>🪙{bet.amount?.toLocaleString()}</span>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, fontWeight:700, color:sc, background:`${sc}18`, border:`1px solid ${sc}40`, borderRadius:20, padding:"3px 10px", marginBottom:6 }}>{label}</div>
          {won && <div style={{ fontSize:15, fontWeight:800, color:"#8bc34a" }}>+🪙{bet.payout?.toLocaleString()}</div>}
        </div>
      </div>
    </div>
  );
}

function PlayerProfile({ user, myBets, wonBets, totalWon, onLogout }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:"linear-gradient(145deg,rgba(232,200,74,0.1),rgba(200,130,42,0.05))", border:"1px solid rgba(232,200,74,0.15)", borderRadius:20, padding:"24px 20px", textAlign:"center" }}>
        <div style={{ width:64,height:64,borderRadius:"50%",margin:"0 auto 12px",background:"linear-gradient(135deg,#e8c84a,#c8822a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28 }}>🎭</div>
        <div style={{ fontFamily:"'Space Grotesk'", fontSize:20, fontWeight:800, color:"#fff" }}>{user.name}</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{user.username}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { label:"Монет", val:(user.coins||0).toLocaleString(), icon:"🪙", c:"#e8c84a" },
          { label:"Ставок", val:myBets.length, icon:"🎯", c:"#64b5f6" },
          { label:"Побед", val:wonBets.length, icon:"🏆", c:"#8bc34a" },
          { label:"Выиграно", val:"🪙"+totalWon.toLocaleString(), icon:"💎", c:"#ce93d8" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"14px", textAlign:"center" }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:20, fontWeight:800, color:s.c }}>{s.val}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <button onClick={onLogout} style={{ width:"100%", padding:"12px", borderRadius:12, border:"1px solid rgba(255,100,100,0.2)", background:"rgba(255,100,100,0.07)", color:"#ff6b6b", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans'" }}>
        Выйти из аккаунта
      </button>
    </div>
  );
}

// ─── TOPUP MODAL ──────────────────────────────────────────────────────────────
function TopupModal({ onClose, onConfirm }) {
  const [amount, setAmount] = useState(500);
  const [comment, setComment] = useState("");
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%",background:"linear-gradient(180deg,#12121e,#0a0a14)",borderTop:"1px solid rgba(139,195,74,0.2)",borderRadius:"22px 22px 0 0",padding:"22px 20px 36px",animation:"slideUp .28s ease" }}>
        <div style={{ width:38,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 20px" }} />
        <div style={{ fontFamily:"'Space Grotesk'",fontSize:20,fontWeight:800,color:"#fff",marginBottom:6 }}>💰 Запрос на пополнение</div>
        <div style={{ fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:20 }}>Администратор получит уведомление и одобрит пополнение</div>

        <div style={{ display:"flex",gap:8,marginBottom:10 }}>
          {[100,500,1000,2000].map(p => (
            <button key={p} onClick={()=>setAmount(p)} style={{ flex:1,padding:"9px 0",borderRadius:10,border:"1px solid",
              borderColor:amount===p?"rgba(139,195,74,0.4)":"rgba(255,255,255,0.08)",
              background:amount===p?"rgba(139,195,74,0.12)":"rgba(255,255,255,0.03)",
              color:amount===p?"#8bc34a":"rgba(255,255,255,0.4)",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",
            }}>{p}</button>
          ))}
        </div>
        <input type="number" value={amount} min={1} onChange={e=>setAmount(parseInt(e.target.value)||0)}
          style={{ width:"100%",boxSizing:"border-box",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(139,195,74,0.3)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:18,fontWeight:700,outline:"none",fontFamily:"'Space Grotesk'",marginBottom:12 }} />
        <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий (необязательно)"
          style={{ width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:14,outline:"none",fontFamily:"'DM Sans'",marginBottom:18 }} />

        <button disabled={amount<=0} onClick={()=>amount>0&&onConfirm(amount,comment)} style={{
          width:"100%",padding:"15px",borderRadius:14,border:"none",
          background:amount>0?"linear-gradient(135deg,#8bc34a,#5d9c2a)":"rgba(255,255,255,0.06)",
          color:amount>0?"#fff":"rgba(255,255,255,0.25)",
          fontSize:16,fontWeight:800,cursor:amount>0?"pointer":"not-allowed",fontFamily:"'Space Grotesk'",
        }}>📨 Отправить запрос на 🪙{amount.toLocaleString()}</button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── BET MODAL ────────────────────────────────────────────────────────────────
function BetModal({ tournament, participant, balance, onClose, onConfirm }) {
  const [amount, setAmount] = useState(100);
  const payout = Math.round(amount * participant.odds);
  const valid = amount > 0 && amount <= balance;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%",background:"linear-gradient(180deg,#12121e,#0a0a14)",borderTop:"1px solid rgba(232,200,74,0.2)",borderRadius:"22px 22px 0 0",padding:"22px 20px 36px",animation:"slideUp .28s ease" }}>
        <div style={{ width:38,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 20px" }} />
        <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:3 }}>{tournament.name}</div>
        <div style={{ fontFamily:"'Space Grotesk'",fontSize:20,fontWeight:800,color:"#fff",marginBottom:2 }}>{participant.name}</div>
        <div style={{ fontSize:13,color:"#e8c84a",marginBottom:18 }}>Роль: {participant.role} · Коэф ×{parseFloat(participant.odds).toFixed(1)}</div>
        <div style={{ display:"flex",gap:8,marginBottom:10 }}>
          {[50,100,250,500].map(p => (
            <button key={p} onClick={()=>setAmount(p)} style={{ flex:1,padding:"9px 0",borderRadius:10,border:"1px solid",
              borderColor:amount===p?"#e8c84a":"rgba(255,255,255,0.08)",
              background:amount===p?"rgba(232,200,74,0.15)":"rgba(255,255,255,0.03)",
              color:amount===p?"#e8c84a":"rgba(255,255,255,0.4)",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",
            }}>{p}</button>
          ))}
        </div>
        <input type="number" value={amount} min={1} max={balance} onChange={e=>setAmount(Math.max(0,parseInt(e.target.value)||0))}
          style={{ width:"100%",boxSizing:"border-box",padding:"12px 16px",borderRadius:12,border:`1px solid ${valid?"rgba(232,200,74,0.3)":"rgba(230,80,80,0.4)"}`,background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:18,fontWeight:700,outline:"none",fontFamily:"'Space Grotesk'" }} />
        <div style={{ fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:7,marginBottom:16,display:"flex",justifyContent:"space-between" }}>
          <span>Баланс: 🪙{balance?.toLocaleString()}</span>
          {amount>balance&&<span style={{ color:"#e05555" }}>Недостаточно</span>}
        </div>
        <div style={{ background:"rgba(232,200,74,0.08)",border:"1px solid rgba(232,200,74,0.18)",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <span style={{ fontSize:13,color:"rgba(255,255,255,0.4)" }}>Возможный выигрыш</span>
          <span style={{ fontFamily:"'Space Grotesk'",fontSize:20,fontWeight:800,color:"#e8c84a" }}>🪙{payout.toLocaleString()}</span>
        </div>
        <button disabled={!valid} onClick={()=>valid&&onConfirm(amount)} style={{
          width:"100%",padding:"15px",borderRadius:14,border:"none",
          background:valid?"linear-gradient(135deg,#e8c84a,#c8822a)":"rgba(255,255,255,0.06)",
          color:valid?"#1a1000":"rgba(255,255,255,0.25)",
          fontSize:16,fontWeight:800,cursor:valid?"pointer":"not-allowed",fontFamily:"'Space Grotesk'",
        }}>ПОСТАВИТЬ {valid?`🪙${amount.toLocaleString()}`:""}</button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminApp({ onExit, showToast }) {
  const [tab, setTab] = useState("tournaments");
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [t, u, r] = await Promise.all([
        adminApi("/admin/tournaments" + (false ? "" : ""), { method:"GET" }).catch(() => adminApi("/tournaments")),
        adminApi("/admin/users"),
        adminApi("/admin/topup/requests"),
      ]);
      setTournaments(Array.isArray(t) ? t : []);
      setUsers(Array.isArray(u) ? u : []);
      setTopupRequests(Array.isArray(r) ? r : []);
    } catch(e) {
      showToast("❌ " + e.message, "error");
    }
    setLoading(false);
  }

  async function handleApproveTopup(id) {
    try {
      await adminApi(`/admin/topup/${id}/approve`, { method:"POST" });
      showToast("✅ Пополнение одобрено!");
      loadAll();
    } catch(e) { showToast("❌ " + e.message, "error"); }
  }

  async function handleRejectTopup(id) {
    try {
      await adminApi(`/admin/topup/${id}/reject`, { method:"POST", body:JSON.stringify({ reason:"Отклонено" }) });
      showToast("❌ Запрос отклонён", "info");
      loadAll();
    } catch(e) { showToast("❌ " + e.message, "error"); }
  }

  const pendingTopups = topupRequests.filter(r => r.status === "pending");

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#fff", maxWidth:480, margin:"0 auto", fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Bebas+Neue&family=Space+Grotesk:wght@700;800&display=swap" rel="stylesheet" />

      <div style={{ padding:"16px 18px 0", position:"sticky", top:0, zIndex:100, background:"linear-gradient(180deg,#0a0a0a 80%,transparent)", backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontFamily:"'Bebas Neue'", fontSize:24, letterSpacing:3, color:"#ff6b6b" }}>ADMIN</div>
              <div style={{ background:"rgba(255,107,107,0.15)", border:"1px solid rgba(255,107,107,0.3)", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:"#ff6b6b" }}>PANEL</div>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>Mafia Bet</div>
          </div>
          <button onClick={onExit} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"7px 12px", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer" }}>← Выйти</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          {[
            { label:"Турниров", val:tournaments.length, c:"#e8c84a" },
            { label:"Игроков", val:users.length, c:"#64b5f6" },
            { label:"Запросов", val:pendingTopups.length, c: pendingTopups.length>0?"#ff6b6b":"#8bc34a" },
          ].map(s => (
            <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"8px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:800, color:s.c }}>{s.val}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:11, padding:3, gap:2, marginBottom:4 }}>
          {[["tournaments","🎭","Турниры"],["users","👥","Игроки"],["topup","💰","Запросы"]].map(([id,ic,lb]) => (
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1, padding:"8px 4px", borderRadius:8, border:"none", cursor:"pointer",
              background:tab===id?"linear-gradient(135deg,#ff6b6b,#cc3333)":"transparent",
              color:tab===id?"#fff":"rgba(255,255,255,0.4)",
              fontSize:12, fontWeight:700, fontFamily:"'DM Sans'", transition:"all .2s",
              position:"relative",
            }}>
              {ic} {lb}
              {id==="topup" && pendingTopups.length>0 && (
                <span style={{ position:"absolute", top:2, right:4, background:"#ff6b6b", borderRadius:"50%", width:14, height:14, fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>{pendingTopups.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"12px 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize:36, marginBottom:10, animation:"spin 1s linear infinite" }}>⚙️</div>
            <div>Загрузка...</div>
          </div>
        ) : tab === "tournaments" ? (
          <AdminTournaments tournaments={tournaments} onReload={loadAll} setModal={setModal} showToast={showToast} />
        ) : tab === "users" ? (
          <AdminUsers users={users} onReload={loadAll} setModal={setModal} showToast={showToast} />
        ) : (
          <AdminTopup requests={topupRequests} onApprove={handleApproveTopup} onReject={handleRejectTopup} />
        )}
      </div>

      {modal?.type==="create_tournament" && <CreateTournamentModal onClose={()=>setModal(null)} onCreate={async t=>{ try{ await adminApi("/admin/tournaments",{method:"POST",body:JSON.stringify(t)}); showToast("🎭 Турнир создан!"); setModal(null); loadAll(); }catch(e){showToast("❌"+e.message,"error");} }} />}
      {modal?.type==="edit_tournament" && <EditTournamentModal tournament={modal.data} onClose={()=>setModal(null)} onSave={async t=>{ try{ await adminApi(`/admin/tournaments/${t.id}`,{method:"PATCH",body:JSON.stringify(t)}); showToast("💾 Сохранено"); setModal(null); loadAll(); }catch(e){showToast("❌"+e.message,"error");} }} onSettle={async(tid,pid)=>{ try{ await adminApi(`/admin/tournaments/${tid}/settle`,{method:"POST",body:JSON.stringify({winner_participant_id:pid})}); showToast("🏆 Турнир завершён!"); setModal(null); loadAll(); }catch(e){showToast("❌"+e.message,"error");} }} onDelete={async tid=>{ try{ await adminApi(`/admin/tournaments/${tid}`,{method:"DELETE"}); showToast("🗑️ Удалён","info"); setModal(null); loadAll(); }catch(e){showToast("❌"+e.message,"error");} }} />}
      {modal?.type==="edit_user" && <EditUserModal user={modal.data} onClose={()=>setModal(null)} onSave={async(uid,op,amt)=>{ try{ await adminApi(`/admin/users/${uid}/coins`,{method:"PATCH",body:JSON.stringify({operation:op,amount:amt})}); showToast("✅ Баланс обновлён"); setModal(null); loadAll(); }catch(e){showToast("❌"+e.message,"error");} }} />}
    </div>
  );
}

function AdminTopup({ requests, onApprove, onReject }) {
  const pending = requests.filter(r=>r.status==="pending");
  const done = requests.filter(r=>r.status!=="pending");
  return (
    <div>
      {pending.length===0 && <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.25)" }}><div style={{ fontSize:36,marginBottom:8 }}>✅</div><div>Новых запросов нет</div></div>}
      {pending.length>0 && <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>Ожидают одобрения — {pending.length}</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:20 }}>
        {pending.map(r => (
          <div key={r.id} style={{ background:"rgba(232,200,74,0.07)",border:"1px solid rgba(232,200,74,0.2)",borderRadius:14,padding:"14px 16px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:"#fff" }}>{r.user_name} <span style={{ color:"rgba(255,255,255,0.35)",fontSize:12 }}>{r.user_username}</span></div>
                <div style={{ fontFamily:"'Space Grotesk'",fontSize:20,fontWeight:800,color:"#e8c84a",marginTop:2 }}>🪙 {r.amount?.toLocaleString()}</div>
                {r.comment && <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4 }}>💬 {r.comment}</div>}
                <div style={{ fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:4 }}>{r.created_at?.slice(0,16)}</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>onApprove(r.id)} style={{ flex:1,padding:"10px",borderRadius:10,border:"1px solid rgba(139,195,74,0.3)",background:"rgba(139,195,74,0.12)",color:"#8bc34a",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'" }}>✅ Одобрить</button>
              <button onClick={()=>onReject(r.id)} style={{ flex:1,padding:"10px",borderRadius:10,border:"1px solid rgba(220,80,80,0.3)",background:"rgba(220,80,80,0.1)",color:"#ff6b6b",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'" }}>❌ Отклонить</button>
            </div>
          </div>
        ))}
      </div>
      {done.length>0 && (
        <>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>История</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {done.slice(0,10).map(r => (
              <div key={r.id} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:"#fff" }}>{r.user_name}</div>
                  <div style={{ fontSize:12,color:"rgba(255,255,255,0.3)" }}>🪙{r.amount?.toLocaleString()}</div>
                </div>
                <div style={{ fontSize:12,fontWeight:700,color:r.status==="approved"?"#8bc34a":"#ff6b6b" }}>
                  {r.status==="approved"?"✅ Одобрен":"❌ Отклонён"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdminTournaments({ tournaments, onReload, setModal, showToast }) {
  return (
    <div>
      <button onClick={()=>setModal({type:"create_tournament"})} style={{ width:"100%",padding:"13px",borderRadius:14,border:"2px dashed rgba(232,200,74,0.3)",background:"rgba(232,200,74,0.05)",color:"#e8c84a",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",marginBottom:14 }}>＋ Создать турнир</button>
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {tournaments.map(t => {
          const parts = typeof t.participants==="string"?JSON.parse(t.participants):t.participants;
          return (
            <div key={t.id} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,overflow:"hidden" }}>
              <div style={{ padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Space Grotesk'",fontSize:16,fontWeight:800,color:"#fff" }}>{t.name}</div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:3 }}>{t.description}</div>
                  </div>
                  <span style={{ fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,flexShrink:0,marginLeft:8,
                    background:t.status==="settled"?"rgba(139,195,74,0.15)":"rgba(232,200,74,0.15)",
                    color:t.status==="settled"?"#8bc34a":"#e8c84a",
                    border:`1px solid ${t.status==="settled"?"rgba(139,195,74,0.3)":"rgba(232,200,74,0.3)"}`,
                  }}>{t.status==="settled"?"✅ Завершён":"🔥 Идёт"}</span>
                </div>
                <div style={{ fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:6 }}>📅 {t.ends_at} · 👥 {parts.length} участников</div>
              </div>
              <div style={{ padding:"10px 14px",display:"flex",flexDirection:"column",gap:6 }}>
                {parts.map(p => (
                  <div key={p.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",borderRadius:10,background:t.winner_id===p.id?"rgba(139,195,74,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${t.winner_id===p.id?"rgba(139,195,74,0.25)":"rgba(255,255,255,0.05)"}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#e8c84a,#c8822a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#1a1000",flexShrink:0 }}>{p.avatar||p.name?.slice(0,2)}</div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:"#fff" }}>{p.name}</div>
                        <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)" }}>{p.role}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      {t.winner_id===p.id&&<span>🏆</span>}
                      <span style={{ fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:800,color:"#e8c84a" }}>×{parseFloat(p.odds).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding:"0 14px 14px" }}>
                <button onClick={()=>setModal({type:"edit_tournament",data:{...t,participants:parts}})} style={{ width:"100%",padding:"9px",borderRadius:10,border:"1px solid rgba(255,107,107,0.2)",background:"rgba(255,107,107,0.07)",color:"#ff6b6b",fontSize:13,fontWeight:700,cursor:"pointer" }}>✏️ Редактировать</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminUsers({ users, onReload, setModal, showToast }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      {users.map(u => (
        <div key={u.id} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#4a90d9,#2060a8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{u.name?.charAt(0)}</div>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:"#fff" }}>{u.name}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>{u.username}</div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Space Grotesk'",fontSize:17,fontWeight:800,color:"#e8c84a" }}>🪙{(u.coins||0).toLocaleString()}</div>
            <button onClick={()=>setModal({type:"edit_user",data:u})} style={{ marginTop:6,padding:"5px 12px",borderRadius:8,border:"1px solid rgba(255,107,107,0.2)",background:"rgba(255,107,107,0.07)",color:"#ff6b6b",fontSize:11,fontWeight:700,cursor:"pointer" }}>✏️ Баланс</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Admin Modals ─────────────────────────────────────────────────────────────
function ModalWrap({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%",background:"linear-gradient(180deg,#141420,#0c0c18)",borderTop:"1px solid rgba(255,107,107,0.2)",borderRadius:"22px 22px 0 0",padding:"22px 20px 36px",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .28s ease" }}>
        <div style={{ width:38,height:4,background:"rgba(255,255,255,0.12)",borderRadius:2,margin:"0 auto 18px" }} />
        <div style={{ fontFamily:"'Space Grotesk'",fontSize:18,fontWeight:800,color:"#fff",marginBottom:18 }}>{title}</div>
        {children}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

function Btn({ children, onClick, variant="primary", disabled=false }) {
  const s = { primary:{background:"linear-gradient(135deg,#e8c84a,#c8822a)",color:"#1a1000",border:"none"}, danger:{background:"rgba(220,50,50,0.12)",color:"#ff6b6b",border:"1px solid rgba(220,50,50,0.25)"}, ghost:{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.08)"}, success:{background:"rgba(139,195,74,0.12)",color:"#8bc34a",border:"1px solid rgba(139,195,74,0.25)"} }[variant];
  return <button onClick={onClick} disabled={disabled} style={{ width:"100%",padding:"13px",borderRadius:12,cursor:disabled?"not-allowed":"pointer",fontSize:14,fontWeight:700,fontFamily:"'DM Sans'",marginBottom:8,opacity:disabled?0.4:1,...s }}>{children}</button>;
}

function CreateTournamentModal({ onClose, onCreate }) {
  const [name,setName]=useState(""); const [desc,setDesc]=useState(""); const [endsAt,setEndsAt]=useState("");
  const [participants,setParticipants]=useState([{id:uid(),name:"",role:"",odds:2.0,avatar:""},{id:uid(),name:"",role:"",odds:3.0,avatar:""}]);
  function addP(){setParticipants(p=>[...p,{id:uid(),name:"",role:"",odds:2.0,avatar:""}]);}
  function removeP(id){setParticipants(p=>p.filter(x=>x.id!==id));}
  function upP(id,f,v){setParticipants(p=>p.map(x=>x.id===id?{...x,[f]:v}:x));}
  function handleCreate(){
    const filled=participants.filter(p=>p.name.trim());
    if(!name.trim()||filled.length<2)return;
    onCreate({name:name.trim(),description:desc.trim(),ends_at:endsAt||"—",participants:filled.map(p=>({...p,avatar:p.avatar||p.name.slice(0,2).toUpperCase(),odds:parseFloat(p.odds)||2}))});
  }
  return (
    <ModalWrap title="🎭 Новый турнир" onClose={onClose}>
      {[["Название",name,setName,"Весенний кубок"],["Описание",desc,setDesc,"Открытый чемпионат"],["Дата окончания",endsAt,setEndsAt,"2026-06-30"]].map(([lb,val,setter,ph])=>(
        <div key={lb} style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>{lb}</div>
          <input value={val} onChange={e=>setter(e.target.value)} placeholder={ph} style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:14,outline:"none",fontFamily:"'DM Sans'"}} />
        </div>
      ))}
      <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Участники</div>
      {participants.map((p,i)=>(
        <div key={p.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px",marginBottom:8,position:"relative"}}>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.3)",marginBottom:8}}>Игрок {i+1}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            {[["name","Имя","Иван Иванов"],["role","Роль","Годфазер"]].map(([f,lb,ph])=>(
              <div key={f}><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>{lb.toUpperCase()}</div><input value={p[f]} onChange={e=>upP(p.id,f,e.target.value)} placeholder={ph} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:13,outline:"none",fontFamily:"'DM Sans'"}}/></div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>КОЭФФИЦИЕНТ</div><input type="number" step="0.1" min="1.1" value={p.odds} onChange={e=>upP(p.id,"odds",e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(232,200,74,0.2)",background:"rgba(232,200,74,0.06)",color:"#e8c84a",fontSize:13,outline:"none",fontFamily:"'Space Grotesk'",fontWeight:700}}/></div>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>АВАТАР (2 букв)</div><input value={p.avatar} onChange={e=>upP(p.id,"avatar",e.target.value.slice(0,2).toUpperCase())} maxLength={2} placeholder="ИИ" style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:13,outline:"none",fontFamily:"'DM Sans'",textTransform:"uppercase"}}/></div>
          </div>
          {participants.length>2&&<button onClick={()=>removeP(p.id)} style={{position:"absolute",top:10,right:10,background:"rgba(220,50,50,0.1)",border:"1px solid rgba(220,50,50,0.2)",borderRadius:6,color:"#ff6b6b",fontSize:11,padding:"2px 8px",cursor:"pointer"}}>✕</button>}
        </div>
      ))}
      <button onClick={addP} style={{width:"100%",padding:"10px",borderRadius:10,border:"1px dashed rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.35)",fontSize:13,cursor:"pointer",marginBottom:16,fontFamily:"'DM Sans'"}}>＋ Участник</button>
      <Btn onClick={handleCreate} disabled={!name.trim()||participants.filter(p=>p.name.trim()).length<2}>🎭 Создать турнир</Btn>
      <Btn onClick={onClose} variant="ghost">Отмена</Btn>
    </ModalWrap>
  );
}

function EditTournamentModal({ tournament, onClose, onSave, onSettle, onDelete }) {
  const [t,setT]=useState({...tournament});
  const [view,setView]=useState("main");
  function upP(id,f,v){setT(prev=>({...prev,participants:prev.participants.map(p=>p.id===id?{...p,[f]:v}:p)}));}
  if(view==="settle") return (
    <ModalWrap title="🏆 Выбрать победителя" onClose={onClose}>
      <div style={{marginBottom:16,fontSize:13,color:"rgba(255,255,255,0.4)"}}>Это действие завершит турнир и выплатит выигрыши.</div>
      {t.participants.map(p=>(
        <button key={p.id} onClick={()=>onSettle(t.id,p.id)} style={{width:"100%",padding:"13px 16px",borderRadius:12,border:"1px solid rgba(139,195,74,0.2)",background:"rgba(139,195,74,0.07)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans'",marginBottom:8,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#e8c84a,#c8822a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#1a1000",flexShrink:0}}>{p.avatar||p.name?.slice(0,2)}</div>
          <div><div>{p.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{p.role} · ×{p.odds}</div></div>
          <span style={{marginLeft:"auto",color:"#8bc34a"}}>🏆</span>
        </button>
      ))}
      <Btn onClick={()=>setView("main")} variant="ghost">← Назад</Btn>
    </ModalWrap>
  );
  return (
    <ModalWrap title={`✏️ ${t.name}`} onClose={onClose}>
      {[["Название","name",""],["Описание","description",""],["Дата","ends_at",""]].map(([lb,f])=>(
        <div key={f} style={{marginBottom:12}}><div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>{lb}</div><input value={t[f]||""} onChange={e=>setT(p=>({...p,[f]:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:14,outline:"none",fontFamily:"'DM Sans'"}}/></div>
      ))}
      <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:6}}>Участники</div>
      {t.participants.map((p,i)=>(
        <div key={p.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px",marginBottom:8,position:"relative"}}>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.3)",marginBottom:8}}>Игрок {i+1}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            {[["name","Имя"],["role","Роль"]].map(([f,lb])=>(
              <div key={f}><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>{lb.toUpperCase()}</div><input value={p[f]||""} onChange={e=>upP(p.id,f,e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:13,outline:"none",fontFamily:"'DM Sans'"}}/></div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>КОЭФФИЦИЕНТ</div><input type="number" step="0.1" min="1.1" value={p.odds} onChange={e=>upP(p.id,"odds",parseFloat(e.target.value)||2)} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(232,200,74,0.2)",background:"rgba(232,200,74,0.06)",color:"#e8c84a",fontSize:13,outline:"none",fontFamily:"'Space Grotesk'",fontWeight:700}}/></div>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>АВАТАР</div><input value={p.avatar||""} onChange={e=>upP(p.id,"avatar",e.target.value.slice(0,2).toUpperCase())} maxLength={2} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:13,outline:"none",fontFamily:"'DM Sans'",textTransform:"uppercase"}}/></div>
          </div>
        </div>
      ))}
      <Btn onClick={()=>onSave(t)}>💾 Сохранить</Btn>
      {t.status==="open"&&<Btn onClick={()=>setView("settle")} variant="success">🏆 Завершить и выбрать победителя</Btn>}
      <Btn onClick={()=>onDelete(t.id)} variant="danger">🗑️ Удалить турнир</Btn>
      <Btn onClick={onClose} variant="ghost">Отмена</Btn>
    </ModalWrap>
  );
}

function EditUserModal({ user, onClose, onSave }) {
  const [op,setOp]=useState("add"); const [delta,setDelta]=useState("");
  function apply(){const d=parseInt(delta);if(!d||d<=0)return;onSave(user.id,op,d);}
  return (
    <ModalWrap title={`👤 ${user.name}`} onClose={onClose}>
      <div style={{fontFamily:"'Space Grotesk'",fontSize:28,fontWeight:800,color:"#e8c84a",marginBottom:16}}>🪙 {(user.coins||0).toLocaleString()}</div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        {["add","subtract"].map(o=>(
          <button key={o} onClick={()=>setOp(o)} style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid",borderColor:op===o?(o==="add"?"rgba(139,195,74,0.4)":"rgba(220,80,80,0.4)"):"rgba(255,255,255,0.08)",background:op===o?(o==="add"?"rgba(139,195,74,0.12)":"rgba(220,80,80,0.12)"):"rgba(255,255,255,0.03)",color:op===o?(o==="add"?"#8bc34a":"#ff6b6b"):"rgba(255,255,255,0.35)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>
            {o==="add"?"＋ Начислить":"－ Списать"}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input type="number" value={delta} min={1} onChange={e=>setDelta(e.target.value)} placeholder="Сумма монет" style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:14,outline:"none",fontFamily:"'DM Sans'"}}/>
        <button onClick={apply} disabled={!delta||parseInt(delta)<=0} style={{padding:"10px 16px",borderRadius:10,border:"none",background:delta&&parseInt(delta)>0?(op==="add"?"linear-gradient(135deg,#8bc34a,#5d9c2a)":"linear-gradient(135deg,#e05555,#a02020)"):"rgba(255,255,255,0.06)",color:delta&&parseInt(delta)>0?"#fff":"rgba(255,255,255,0.25)",fontSize:14,fontWeight:700,cursor:delta&&parseInt(delta)>0?"pointer":"not-allowed",fontFamily:"'DM Sans'"}}>OK</button>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[100,500,1000,5000].map(q=>(
          <button key={q} onClick={()=>setDelta(String(q))} style={{flex:1,padding:"6px 0",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:delta==q?"rgba(232,200,74,0.12)":"rgba(255,255,255,0.03)",color:delta==q?"#e8c84a":"rgba(255,255,255,0.35)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>{q}</button>
        ))}
      </div>
      <Btn onClick={onClose} variant="ghost">Закрыть</Btn>
    </ModalWrap>
  );
}

// ─── ADMIN PIN ────────────────────────────────────────────────────────────────
function AdminKeyScreen({ onSuccess, onCancel }) {
  const [key,setKey]=useState(""); const [err,setErr]=useState(false);
  async function tryKey(){
    try {
      const res = await fetch(`${API_URL}/admin/users`,{headers:{"X-Admin-Key":key,"Content-Type":"application/json"}});
      if(res.ok){ localStorage.setItem("mafbet_admin_key",key); onSuccess(); }
      else { setErr(true); setTimeout(()=>setErr(false),1000); }
    } catch { setErr(true); setTimeout(()=>setErr(false),1000); }
  }
  return (
    <div style={{minHeight:"100vh",background:"#080810",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:20}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Bebas+Neue&family=Space+Grotesk:wght@800&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:28,letterSpacing:4,color:"#ff6b6b",marginBottom:6}}>ADMIN</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:32}}>Введите Admin Key из .env файла</div>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:24}}>
          <input value={key} onChange={e=>setKey(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryKey()} type="password" placeholder="Admin Key..."
            style={{width:"100%",boxSizing:"border-box",padding:"13px 16px",borderRadius:12,border:`1px solid ${err?"rgba(220,80,80,0.5)":"rgba(255,255,255,0.1)"}`,background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:15,outline:"none",fontFamily:"'DM Sans'",marginBottom:12}}/>
          {err&&<div style={{color:"#ff6b6b",fontSize:12,marginBottom:12}}>❌ Неверный ключ</div>}
          <button onClick={tryKey} disabled={!key} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:key?"linear-gradient(135deg,#ff6b6b,#cc3333)":"rgba(255,255,255,0.06)",color:key?"#fff":"rgba(255,255,255,0.25)",fontSize:15,fontWeight:800,cursor:key?"pointer":"not-allowed",fontFamily:"'Space Grotesk'",marginBottom:10}}>Войти в админку</button>
          <button onClick={onCancel} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.35)",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans'"}}>← Назад</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("loading"); // loading | login | player | adminKey | admin
  const [currentUser, setCurrentUser] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("mafbet_token");
    if (token) {
      api("/me").then(u => { setCurrentUser(u); setMode("player"); })
               .catch(() => { localStorage.removeItem("mafbet_token"); setMode("login"); });
    } else {
      setMode("login");
    }
  }, []);

  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3000);
  }, []);

  async function handleLogin(data) {
    setLoginLoading(true);
    setLoginError("");
    try {
      // В реальном Telegram Mini App здесь будет initData от window.Telegram.WebApp
      // Для теста передаём данные напрямую
      const initData = `user=${encodeURIComponent(JSON.stringify({id: Math.floor(Math.random()*999999)+1000, first_name: data.name, username: data.username.replace("@","")}))}`;
      const res = await api("/auth/telegram", {
        method:"POST",
        body: JSON.stringify({ init_data: initData })
      });
      localStorage.setItem("mafbet_token", res.token);
      setCurrentUser(res.user);
      setMode("player");
    } catch(e) {
      setLoginError(e.message);
    }
    setLoginLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem("mafbet_token");
    setCurrentUser(null);
    setMode("login");
  }

  if (mode === "loading") {
    return (
      <div style={{minHeight:"100vh",background:"#080810",display:"flex",alignItems:"center",justifyContent:"center",color:"#e8c84a"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:12,animation:"spin 1.2s linear infinite"}}>🎭</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:3}}>ЗАГРУЗКА...</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>
      </div>
    );
  }

  return (
    <>
      {mode==="login" && <LoginScreen onLogin={handleLogin} loading={loginLoading} error={loginError} />}
      {mode==="player" && currentUser && <PlayerApp currentUser={currentUser} onSwitchAdmin={()=>setMode("adminKey")} onLogout={handleLogout} showToast={showToast} />}
      {mode==="adminKey" && <AdminKeyScreen onSuccess={()=>setMode("admin")} onCancel={()=>setMode("player")} />}
      {mode==="admin" && <AdminApp onExit={()=>setMode("player")} showToast={showToast} />}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <style>{`*{box-sizing:border-box;}body{margin:0;}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}input[type=number]{-moz-appearance:textfield;} @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
