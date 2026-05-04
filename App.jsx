import { useState, useRef, useEffect } from "react";

const G = "#006938";
const GOLD = "#C9A84C";
const DARK = "#0a1628";
const CARD = "rgba(255,255,255,0.05)";
const BDR = "rgba(255,255,255,0.09)";

const SYSTEM = `You are Khalid, a warm and emotionally intelligent senior Relationship Manager at Al Rajhi Bank Saudi Arabia. You speak English naturally with occasional Arabic greetings (Ahlan, Marhaba, InshaAllah, Yalla). You are the single point of contact for expat customers.

YOUR THREE ROLES:
1. ACQUISITION - Bring in new customers. Ask about their current bank, pain points, financial needs.
2. SERVICE - Handle queries, complaints, requests with empathy first, solution second.
3. CROSS-SELLING - After understanding the profile, suggest ONE relevant additional product.

CUSTOMER PROFILING - gather naturally one question at a time:
- Full name, nationality, which city in KSA, how long in KSA
- Employment: White Collar (engineer/doctor/manager/accountant/teacher) or Blue Collar (driver/laborer/technician/hospitality/security)
- Employer name, monthly salary in SAR, Iqama validity (months remaining)
- Existing Al Rajhi products, financial goals

PRODUCT KNOWLEDGE:

PERSONAL FINANCE (PF):
- Up to SAR 300,000 | Tenure up to 60 months
- White collar minimum salary: SAR 3,000/month
- Blue collar minimum salary: SAR 2,000/month (approved employers only)
- Requirements: Valid Iqama, salary transfer to Al Rajhi, employment letter, clean credit
- Shariah-compliant Murabaha | Same-day disbursement if documents complete
- Best for: Family emergencies, home construction, medical, education

AUTO FINANCE (AF):
- New and used vehicles | Up to SAR 200,000
- Tenure up to 60 months | Down payment 10-20%
- Minimum salary SAR 4,000 | Iqama must have 1+ year remaining
- 6 months employment required | Takaful insurance bundled
- All major brands | Used cars max 5 years old

HOME FINANCE (HF):
- Finance property in HOME COUNTRY (India, Pakistan, Egypt, Philippines, Bangladesh, Sri Lanka, etc.)
- Up to SAR 500,000 equivalent | Tenure up to 20 years
- Minimum salary SAR 6,000 | Minimum 2 years stable employment
- Requires property valuation and title deed from home country

CREDIT CARDS (CC):
- Classic: Limit SAR 3,000-10,000 | Minimum salary SAR 3,000
- Gold: Limit SAR 10,000-30,000 | Minimum salary SAR 5,000
- Platinum: Limit SAR 30,000-80,000 | Minimum salary SAR 10,000
- All Shariah-compliant | Cashback on fuel and groceries
- Platinum: Free travel insurance, no international fees

SAVINGS AND ACCOUNTS:
- Current Account: Free, instant digital access
- Savings Account: Profit sharing on balance
- Urpay Digital Wallet: Cheapest remittances to home countries

TAKAFUL INSURANCE:
- Life Takaful for expats
- Health Takaful supplement
- Vehicle Takaful bundled with Auto Finance

INVESTMENT:
- Shariah-compliant Mutual Funds from SAR 1,000
- Gold savings certificates

COMPLIANCE AND KYC:
- Valid Iqama is mandatory for ALL products
- Salary transfer to Al Rajhi required for loans and cards
- SAMA regulations apply | PDPL data privacy | AML checks standard
- If Iqama expires in less than 3 months: ALWAYS advise renewal before applying

CROSS-SELL LOGIC:
- Car finance owner -> suggest Vehicle Takaful or Life Takaful
- Sends remittances -> recommend Urpay wallet
- Salary over SAR 8,000 with loan -> suggest Mutual Fund investment
- No credit card -> suggest Classic card to build KSA credit history
- Has loan -> suggest Savings Account for emergency fund

EMOTIONAL INTELLIGENCE:
- Blue collar workers feel banks are not for them. Warmly reassure Al Rajhi serves EVERYONE.
- Expats miss family. Acknowledge their sacrifice.
- Never judge salary, job type, or nationality.
- If customer seems stressed: be compassionate, do not hard sell.
- New to KSA under 6 months: be extra patient and explain simply.
- Complaint: Apologize first, empathize, THEN offer solution.

SALES WORKFLOW:
1. Warm greeting, ask name and how long in KSA
2. Discover need: What brings you to Al Rajhi today?
3. Profile: gather salary, employer, Iqama naturally
4. Qualify: check eligibility
5. Pitch: 2-3 benefits tailored to their situation
6. Handle objections: reassure and offer alternatives
7. Document guide: tell them exactly what to bring
8. Cross-sell: one gentle suggestion
9. Close: summarize and confirm next steps

RESPONSE STYLE:
- Maximum 3-4 sentences per reply
- Ask only ONE question at a time
- Warm and human, not robotic
- Simple English for non-native speakers

SALES TRACKING - After pitching any product, append EXACTLY this block:
<<<SALES>>>
name:[full name or unknown]
phone:[+966 number or unknown]
nationality:[country or unknown]
salary:[SAR amount or unknown]
employer:[name or unknown]
iqama:[months remaining or unknown]
type:[White Collar or Blue Collar or unknown]
product:[PF or AF or HF or CC or Insurance or Investment or Account]
amount:[SAR amount or N/A]
stage:[Lead or Qualified or Application Ready or Cross-sell Suggested]
flag:[compliance issue or none]
<<<END>>>`;

function parseEvent(text) {
  const m = text.match(/<<<SALES>>>([\s\S]*?)<<<END>>>/);
  if (!m) return null;
  const b = m[1];
  const g = k => {
    const r = new RegExp(k + ":([^\n]+)");
    const x = b.match(r);
    return x ? x[1].trim() : "";
  };
  return {
    name: g("name"), phone: g("phone"), nationality: g("nationality"),
    salary: g("salary"), employer: g("employer"), iqama: g("iqama"),
    type: g("type"), product: g("product"), amount: g("amount"),
    stage: g("stage"), flag: g("flag"),
    ts: new Date().toLocaleString("en-GB")
  };
}

function cleanText(text) {
  return text.replace(/<<<SALES>>>[\s\S]*?<<<END>>>/g, "").trim();
}

const STAGE_COLOR = {
  "Lead": "#1a4a8a",
  "Qualified": "#1a6b3c",
  "Application Ready": "#006938",
  "Cross-sell Suggested": "#5a1a7c"
};

const PRODUCT_FULL = {
  PF: "Personal Finance", AF: "Auto Finance", HF: "Home Finance",
  CC: "Credit Card", Insurance: "Takaful Insurance",
  Investment: "Mutual Fund", Account: "Bank Account"
};

function Tag({ label, color }) {
  const c = color || G;
  return (
    <span style={{
      background: c + "28", color: c,
      border: "1px solid " + c + "55",
      fontSize: 10, fontWeight: 700,
      padding: "2px 9px", borderRadius: 20
    }}>{label}</span>
  );
}

function Dots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "11px 16px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: GOLD,
          animation: "dk 1.2s " + (i * 0.2) + "s infinite ease-in-out"
        }} />
      ))}
    </div>
  );
}

function EventCard({ ev }) {
  const sc = STAGE_COLOR[ev.stage] || G;
  return (
    <div style={{
      background: CARD, border: "1px solid " + BDR,
      borderLeft: "3px solid " + sc,
      borderRadius: 10, padding: "11px 14px", marginTop: 10
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <Tag label={ev.stage} color={sc} />
        <Tag label={PRODUCT_FULL[ev.product] || ev.product} color={GOLD} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {[
          ["Customer", ev.name],
          ["Type", ev.type],
          ["Salary", ev.salary ? "SAR " + ev.salary : "-"],
          ["Iqama", ev.iqama ? ev.iqama + " months" : "-"]
        ].map(([l, v]) => (
          <div key={l}>
            <span style={{ color: "#5a7a6a", fontSize: 10 }}>{l}: </span>
            <span style={{ color: "#b8d4c8", fontSize: 11 }}>{v || "-"}</span>
          </div>
        ))}
      </div>
      {ev.flag && ev.flag !== "none" && (
        <div style={{ marginTop: 7, color: "#e07c40", fontSize: 11 }}>Warning: {ev.flag}</div>
      )}
    </div>
  );
}

function CRMPanel({ events, onExport }) {
  const total = events.length;
  const qual = events.filter(e => ["Qualified", "Application Ready"].includes(e.stage)).length;
  const wc = events.filter(e => e.type && e.type.includes("White")).length;
  const bc = events.filter(e => e.type && e.type.includes("Blue")).length;
  const flagged = events.filter(e => e.flag && e.flag !== "none").length;
  const pc = {};
  events.forEach(e => { if (e.product) pc[e.product] = (pc[e.product] || 0) + 1; });
  const totalSAR = events.reduce((s, e) => s + (parseInt((e.amount || "").replace(/\D/g, "")) || 0), 0);

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>CRM Dashboard</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[[total, "Total Leads", G], [qual, "Qualified", "#1a6b3c"], [flagged, "Flagged", "#b04a10"]].map(([v, l, c]) => (
          <div key={l} style={{ background: c + "18", border: "1px solid " + c + "35", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ color: c, fontSize: 22, fontWeight: 700 }}>{v}</div>
            <div style={{ color: "#5a7a6a", fontSize: 10 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[[wc, "White Collar", "#6ab0f5"], [bc, "Blue Collar", "#f5b06a"]].map(([v, l, c]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid " + BDR, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ color: c, fontSize: 20, fontWeight: 700 }}>{v}</div>
            <div style={{ color: "#5a7a6a", fontSize: 10 }}>{l}</div>
          </div>
        ))}
      </div>
      {Object.keys(pc).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#5a7a6a", fontSize: 10, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Product Pipeline</div>
          {Object.entries(pc).map(([p, c]) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#b8d4c8", fontSize: 11, width: 120, flexShrink: 0 }}>{PRODUCT_FULL[p] || p}</span>
              <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
                <div style={{ width: ((c / total) * 100) + "%", height: "100%", background: G, borderRadius: 3 }} />
              </div>
              <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, width: 16, textAlign: "right" }}>{c}</span>
            </div>
          ))}
        </div>
      )}
      {totalSAR > 0 && (
        <div style={{ background: GOLD + "14", border: "1px solid " + GOLD + "35", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ color: "#5a7a6a", fontSize: 10 }}>Total Finance Requested</div>
          <div style={{ color: GOLD, fontSize: 18, fontWeight: 700 }}>SAR {totalSAR.toLocaleString()}</div>
        </div>
      )}
      {events.length > 0 ? (
        <button onClick={onExport} style={{ width: "100%", background: "linear-gradient(135deg," + G + ",#004d29)", border: "1px solid " + GOLD + "44", borderRadius: 10, padding: "10px 0", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 12 }}>
          Export {events.length} Leads to Excel
        </button>
      ) : (
        <div style={{ color: "#2a4a38", fontSize: 12, textAlign: "center", padding: 12 }}>No leads yet. Start a chat with Khalid!</div>
      )}
    </div>
  );
}

function WorkflowPanel() {
  const steps = [
    ["Lead Generation", "Referrals, walk-in, social media, inbound"],
    ["Qualification", "Check salary, Iqama validity, employer"],
    ["Product Pitch", "Tailored to customer goals and profile"],
    ["KYC Onboarding", "Documents, compliance, SAMA and AML"],
    ["After-Sales", "Follow-ups, renewals, cross-sell check-ins"]
  ];
  const kyc = [
    "Valid Iqama verified",
    "Salary transfer to Al Rajhi confirmed",
    "Employment letter on file",
    "SAMA credit check passed",
    "AML screening completed",
    "PDPL data privacy consent obtained"
  ];
  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Sales Workflow</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 16 }}>
        {[["Acquisition", "#1a3a6b"], ["Service", "#1a6b3c"], ["Cross-Sell", "#6b1a1a"]].map(([l, c]) => (
          <div key={l} style={{ background: c + "28", border: "1px solid " + c + "55", borderRadius: 9, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ color: "#c8dcd2", fontSize: 11, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>
      {steps.map(([t, d], i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: G + "30", border: "1px solid " + G + "60", display: "flex", alignItems: "center", justifyContent: "center", color: "#a8d4b8", fontWeight: 700, fontSize: 12 }}>{i + 1}</div>
            {i < 4 && <div style={{ width: 1, height: 16, background: G + "35", marginTop: 2 }} />}
          </div>
          <div style={{ paddingTop: 5 }}>
            <div style={{ color: "#e0ece6", fontSize: 12, fontWeight: 600 }}>{t}</div>
            <div style={{ color: "#5a7a6a", fontSize: 11, marginTop: 2 }}>{d}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 14, background: CARD, border: "1px solid " + BDR, borderRadius: 10, padding: 14 }}>
        <div style={{ color: "#5a7a6a", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>KYC Checklist</div>
        {kyc.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <div style={{ width: 13, height: 13, borderRadius: 3, border: "1px solid " + G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 8, color: G, fontWeight: 700 }}>v</span>
            </div>
            <span style={{ color: "#8ab0a0", fontSize: 11 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiKeyGate({ onKey }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const test = async () => {
    if (!val.startsWith("sk-")) { setErr("Key must start with sk-"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + val },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 5, messages: [{ role: "user", content: "hi" }] })
      });
      const d = await res.json();
      if (d.error) { setErr(d.error.message); }
      else { sessionStorage.setItem("arb_oai_key", val); onKey(val); }
    } catch (e) { setErr("Network error: " + e.message); }
    setLoading(false);
  };

  const steps = [
    "Go to platform.openai.com",
    "Sign in with Google or email",
    "Click API Keys in the left sidebar",
    "Click Create new secret key",
    "Add $5 credit in Billing (covers 500+ chats)"
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DARK, padding: 20 }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 30px", maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg," + G + ",#004d29)", border: "2px solid " + GOLD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <rect x="2" y="18" width="26" height="9" rx="1.5" fill="#C9A84C"/>
            <rect x="7" y="10" width="16" height="9" rx="1.5" fill="#C9A84C"/>
            <rect x="12" y="3" width="6" height="8" rx="1.5" fill="#C9A84C"/>
          </svg>
        </div>
        <div style={{ color: GOLD, fontSize: 20, fontWeight: 700, marginBottom: 5 }}>Al Rajhi Bank</div>
        <div style={{ color: "#e0ece6", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Khalid - RM Agent</div>
        <div style={{ color: "#5a7a6a", fontSize: 12, marginBottom: 22, lineHeight: 1.6 }}>Powered by OpenAI GPT-4o mini</div>
        <div style={{ background: "rgba(0,105,56,0.1)", border: "1px solid " + G + "44", borderRadius: 12, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Get your OpenAI API key:</div>
          {steps.map((s, i) => (
            <div key={i} style={{ color: "#90b8a0", fontSize: 12, marginBottom: 6, display: "flex", gap: 8 }}>
              <span style={{ color: G, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
            style={{ display: "inline-block", marginTop: 10, background: G, color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 8, textDecoration: "none" }}>
            Open OpenAI Platform
          </a>
        </div>
        <input
          type="password" value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && test()}
          placeholder="sk-proj-..."
          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 14px", color: "#e8f0ec", fontSize: 13, fontFamily: "monospace", marginBottom: 10 }}
        />
        {err && <div style={{ color: "#e07c40", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <button onClick={test} disabled={loading || !val}
          style={{ width: "100%", background: "linear-gradient(135deg," + G + ",#004d29)", border: "2px solid " + GOLD, borderRadius: 12, padding: "13px 0", cursor: val && !loading ? "pointer" : "not-allowed", color: "#fff", fontWeight: 700, fontSize: 14, opacity: val && !loading ? 1 : 0.5 }}>
          {loading ? "Verifying..." : "Launch Khalid"}
        </button>
        <div style={{ marginTop: 12, color: "#3a5a4a", fontSize: 11 }}>Key stored in your browser session only. Never sent to any server.</div>
      </div>
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("arb_oai_key") || "");
  const [tab, setTab] = useState("chat");
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [events, setEvents] = useState([]);
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const callAI = async (history) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM },
          ...history.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.choices?.[0]?.message?.content || "Sorry, please try again.";
  };

  const start = async () => {
    setStarted(true); setBusy(true);
    try {
      const raw = await callAI([{ role: "user", content: "Hello" }]);
      const ev = parseEvent(raw);
      if (ev) setEvents(p => [...p, ev]);
      setMsgs([{ role: "assistant", content: cleanText(raw), ev }]);
    } catch {
      setMsgs([{ role: "assistant", content: "Ahlan wa sahlan! I am Khalid from Al Rajhi Bank. How can I help you today?" }]);
    }
    setBusy(false);
  };

  const send = async (override) => {
    const txt = override || input.trim();
    if (!txt || busy) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    const next = [...msgs, { role: "user", content: txt }];
    setMsgs(next); setBusy(true);
    try {
      const raw = await callAI(next);
      const ev = parseEvent(raw);
      if (ev) setEvents(p => [...p, ev]);
      setMsgs(p => [...p, { role: "assistant", content: cleanText(raw), ev }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: "Sorry, there was an error: " + e.message }]);
    }
    setBusy(false);
    setTimeout(() => { if (taRef.current) taRef.current.focus(); }, 80);
  };

  const exportCSV = () => {
    const h = ["Name", "Phone", "Nationality", "Salary (SAR)", "Employer", "Iqama (months)", "Type", "Product", "Amount", "Stage", "Flag", "Timestamp"];
    const rows = events.map(e => [e.name, e.phone, e.nationality, e.salary, e.employer, e.iqama, e.type, e.product, e.amount, e.stage, e.flag, e.ts]);
    const csv = [h, ...rows].map(r => r.map(c => '"' + String(c || "").replace(/"/g, '""') + '"').join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "AlRajhi_Leads_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
  };

  if (!apiKey) {
    return <ApiKeyGate onKey={k => { sessionStorage.setItem("arb_oai_key", k); setApiKey(k); }} />;
  }

  const quickR = [
    "I need a personal loan",
    "I want to finance a car",
    "Buy property in my home country",
    "Apply for a credit card",
    "I have a complaint about my account"
  ];

  const tabs = [
    ["chat", "Chat", 0],
    ["crm", "CRM", events.length],
    ["wf", "Workflow", 0]
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a1628; }
        @keyframes dk { 0%,80%,100% { transform:scale(.6); opacity:.4; } 40% { transform:scale(1); opacity:1; } }
        @keyframes up { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow:0 0 0 0 rgba(201,168,76,.3); } 50% { box-shadow:0 0 0 9px rgba(201,168,76,0); } }
        .msg { animation: up .25s ease forwards; }
        textarea, input { font-family: inherit; }
        textarea:focus, input:focus, button:focus { outline: none; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1a3a2a; border-radius: 3px; }
      `}</style>

      <div style={{ fontFamily: "'Sora', sans-serif", background: DARK, minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 800, margin: "0 auto" }}>

        <div style={{ background: "linear-gradient(135deg," + G + ",#004d29,#003318)", padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid " + GOLD, position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg," + GOLD + ",#9a7020)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 20, animation: started ? "glow 2.5s infinite" : "none" }}>K</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Khalid - Al Rajhi RM Agent</div>
            <div style={{ color: "#90c4a8", fontSize: 11 }}>{started ? (busy ? "typing..." : "Online - Expat Banking Specialist") : "Powered by OpenAI GPT-4o mini"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: GOLD, fontWeight: 700 }}>Al Rajhi Bank</div>
            {events.length > 0 && (
              <button onClick={exportCSV} style={{ background: GOLD, border: "none", borderRadius: 5, padding: "3px 9px", cursor: "pointer", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                Export ({events.length})
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", background: "#081018", borderBottom: "1px solid " + BDR }}>
          {tabs.map(([id, lbl, badge]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: "none", border: "none", borderBottom: tab === id ? "2px solid " + GOLD : "2px solid transparent", padding: "10px 4px", cursor: "pointer", color: tab === id ? GOLD : "#4a6a5a", fontSize: 11, fontWeight: tab === id ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "color .2s" }}>
              {lbl}
              {badge > 0 && <span style={{ background: G, color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 9, fontWeight: 700 }}>{badge}</span>}
            </button>
          ))}
        </div>

        {tab === "crm" && <div style={{ flex: 1, overflowY: "auto", background: "#080f1a" }}><CRMPanel events={events} onExport={exportCSV} /></div>}
        {tab === "wf" && <div style={{ flex: 1, overflowY: "auto", background: "#080f1a" }}><WorkflowPanel /></div>}

        {tab === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 12, minHeight: 380 }}>
              {!started ? (
                <div style={{ margin: "auto", textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ width: 78, height: 78, margin: "0 auto 20px", background: "linear-gradient(135deg," + G + ",#004d29)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + GOLD }}>
                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                      <rect x="3" y="24" width="32" height="11" rx="2" fill="#C9A84C"/>
                      <rect x="9" y="14" width="20" height="11" rx="2" fill="#C9A84C"/>
                      <rect x="15" y="5" width="8" height="10" rx="2" fill="#C9A84C"/>
                    </svg>
                  </div>
                  <div style={{ color: GOLD, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Welcome to Al Rajhi Bank</div>
                  <div style={{ color: "#c0dace", fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Meet Khalid - Your AI Relationship Manager</div>
                  <div style={{ color: "#3a5a4a", fontSize: 13, lineHeight: 1.7, maxWidth: 340, margin: "0 auto 24px" }}>
                    Helping expats across KSA with Personal Finance, Auto Finance, Home Finance, Credit Cards and more. All Shariah-compliant.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 24 }}>
                    {["Acquisition", "Service", "Cross-Sell", "CRM Tracking", "KYC Compliance"].map(f => (
                      <span key={f} style={{ background: G + "22", border: "1px solid " + G + "44", borderRadius: 18, padding: "4px 12px", color: "#80b898", fontSize: 10 }}>{f}</span>
                    ))}
                  </div>
                  <button onClick={start} style={{ background: "linear-gradient(135deg," + G + ",#004d29)", border: "2px solid " + GOLD, borderRadius: 14, padding: "13px 40px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 20px " + G + "55" }}>
                    Start with Khalid
                  </button>
                </div>
              ) : (
                <>
                  {msgs.map((m, i) => (
                    <div key={i} className="msg" style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 9 }}>
                      {m.role === "assistant" && (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg," + GOLD + ",#9a7020)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13, flexShrink: 0 }}>K</div>
                      )}
                      <div style={{ maxWidth: "75%" }}>
                        <div style={{ background: m.role === "user" ? "linear-gradient(135deg," + G + ",#004d29)" : CARD, border: m.role === "user" ? "none" : "1px solid " + BDR, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "11px 15px", color: "#deeee6", fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                          {m.content}
                        </div>
                        {m.ev && <EventCard ev={m.ev} />}
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="msg" style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg," + GOLD + ",#9a7020)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13, flexShrink: 0 }}>K</div>
                      <div style={{ background: CARD, border: "1px solid " + BDR, borderRadius: "18px 18px 18px 4px" }}><Dots /></div>
                    </div>
                  )}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {started && msgs.length <= 1 && !busy && (
              <div style={{ padding: "0 14px 10px", display: "flex", gap: 7, flexWrap: "wrap" }}>
                {quickR.map(q => (
                  <button key={q} onClick={() => send(q)} style={{ background: G + "18", border: "1px solid " + G + "44", borderRadius: 20, padding: "7px 13px", cursor: "pointer", color: "#80b898", fontSize: 11, fontWeight: 500 }}>{q}</button>
                ))}
              </div>
            )}

            {started && (
              <div style={{ padding: "10px 14px 18px", background: "rgba(8,16,24,.97)", borderTop: "1px solid " + BDR, display: "flex", gap: 9, alignItems: "flex-end" }}>
                <textarea
                  ref={taRef} value={input} rows={1}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px"; }}
                  placeholder="Type your message... (Enter to send)"
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid " + BDR, borderRadius: 13, padding: "11px 15px", color: "#deeee6", fontSize: 13, maxHeight: 110, overflowY: "auto" }}
                />
                <button onClick={() => send()} disabled={!input.trim() || busy}
                  style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: input.trim() && !busy ? "linear-gradient(135deg," + G + ",#004d29)" : "rgba(255,255,255,0.07)", cursor: input.trim() && !busy ? "pointer" : "not-allowed", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                  &#9658;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
