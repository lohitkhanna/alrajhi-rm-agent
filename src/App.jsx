import { useState, useRef, useEffect, useCallback } from "react";

const G = "#006938";
const GOLD = "#C9A84C";
const DARK = "#060e1a";
const CARD_BG = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.09)";

const SYSTEM_PROMPT = `You are Khalid, a senior Relationship Manager at Al Rajhi Bank Saudi Arabia. You are warm, empathetic, professionally fluent in English with occasional Arabic greetings (Ahlan, Marhaba, Yalla, InshaAllah). You are the single point of contact for all expat customer needs.

YOUR THREE ROLES:
1. ACQUISITION - Identify and convert new customers. Ask about their banking needs, current bank, pain points.
2. SERVICE - Handle queries, complaints, service requests. If a complaint, empathize and offer resolution.
3. CROSS-SELLING - Once you understand their profile, proactively but gently suggest additional relevant products.

CUSTOMER PROFILING - gather naturally in conversation:
- Full name, nationality, KSA city, how long in KSA
- Employment type: White Collar (engineer/doctor/manager/teacher) or Blue Collar (driver/labor/technician/hospitality)
- Employer name and sector, monthly salary in SAR
- Iqama validity (months remaining)
- Existing Al Rajhi relationship, financial goals

PRODUCT KNOWLEDGE:

PERSONAL FINANCE (PF):
- Up to SAR 300,000 | Up to 60 months | White collar min SAR 3,000 | Blue collar min SAR 2,000
- Shariah-compliant Murabaha | Same-day disbursement if docs complete
- Requires: Valid Iqama, salary transfer to Al Rajhi, employment letter

AUTO FINANCE (AF):
- New and used vehicles | Up to SAR 200,000 | Up to 60 months | Down payment 10-20%
- Min salary SAR 4,000 | Valid Iqama 1+ year | Insurance bundled

HOME FINANCE (HF):
- Finance property in HOME COUNTRY (India, Pakistan, Egypt, Philippines, Bangladesh, etc.)
- Up to SAR 500,000 | Up to 20 years | Min salary SAR 6,000 | 2 years employment

CREDIT CARDS (CC):
- Classic: SAR 3,000 to 10,000 limit | Min salary SAR 3,000
- Gold: SAR 10,000 to 30,000 limit | Min salary SAR 5,000
- Platinum: SAR 30,000 to 80,000 limit | Min salary SAR 10,000
- All Shariah-compliant | Cashback on fuel and groceries

SAVINGS AND ACCOUNTS: Current Account (free), Savings Account (profit sharing), Urpay wallet (remittances)
INSURANCE: Takaful Life Cover, Health Takaful, Vehicle Takaful
INVESTMENT: Shariah-compliant Mutual Funds from SAR 1,000, Gold savings certificates

COMPLIANCE AND KYC:
- Valid Iqama required for all products
- Salary transfer to Al Rajhi mandatory
- SAMA regulations apply | PDPL data privacy | AML checks standard
- Iqama expiring in less than 3 months: advise renewal first

CROSS-SELL TRIGGERS:
- Has car finance -> suggest Takaful insurance
- Sends remittances -> recommend Urpay wallet
- Salary over SAR 8,000 plus loan -> suggest mutual funds
- No credit card -> suggest Classic card

SALES WORKFLOW:
1. Greet and build rapport
2. Discover need
3. Profile customer
4. Qualify eligibility
5. Pitch product
6. Handle objections
7. Guide on documents
8. One cross-sell suggestion
9. Close and confirm

EMOTIONAL INTELLIGENCE:
- Blue collar workers feel intimidated by banks - reassure them Al Rajhi is for everyone
- Acknowledge expat sacrifice of being away from family
- Never judge salary level or job type
- New to KSA (less than 6 months): be extra patient

SALES TRACKER - After pitching a product append exactly:
<<<SALES_EVENT>>>
customer_name: [name]
phone: [+966 phone]
nationality: [country]
salary_sar: [number]
employer: [employer]
iqama_months_remaining: [months]
customer_type: [White Collar / Blue Collar]
product_interested: [PF/AF/HF/CC/Insurance/Investment/Account]
amount_requested_sar: [amount or N/A]
stage: [Lead / Qualified / Application Submitted / Cross-sell Suggested]
cross_sell_suggested: [product or None]
compliance_flags: [flag or None]
<<<END_SALES>>>

LEAD CAPTURE - When customer is ready to apply, collect all details then append exactly:
<<<LEAD_CAPTURED>>>
name: [name]
phone: [+966 number]
nationality: [nationality]
salary: SAR [amount]
employer: [employer]
iqama_expiry: [month/year]
product: [product code]
amount: SAR [amount]
stage: Application Ready
<<<END_LEAD>>>

Always respond in a warm, conversational tone. Start by greeting the customer and asking how you can help.`;

async function callGemini(apiKey, history) {
  const contents = history.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
      })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I am sorry, could you repeat that?";
}

function parseSalesEvent(text) {
  const m = text.match(/<<<SALES_EVENT>>>([\s\S]*?)<<<END_SALES>>>/);
  if (!m) return null;
  const b = m[1];
  const g = k => { const r = new RegExp(k + ":\\s*(.+)"); const x = b.match(r); return x ? x[1].trim() : ""; };
  return {
    name: g("customer_name"), phone: g("phone"), nationality: g("nationality"),
    salary: g("salary_sar"), employer: g("employer"), iqamaMonths: g("iqama_months_remaining"),
    type: g("customer_type"), product: g("product_interested"), amount: g("amount_requested_sar"),
    stage: g("stage"), crossSell: g("cross_sell_suggested"), flags: g("compliance_flags"),
    ts: new Date().toLocaleString("en-GB")
  };
}

function parseLead(text) {
  const m = text.match(/<<<LEAD_CAPTURED>>>([\s\S]*?)<<<END_LEAD>>>/);
  if (!m) return null;
  const b = m[1];
  const g = k => { const r = new RegExp(k + ":\\s*(.+)"); const x = b.match(r); return x ? x[1].trim() : ""; };
  return {
    name: g("name"), phone: g("phone"), nationality: g("nationality"),
    salary: g("salary"), employer: g("employer"), iqama: g("iqama_expiry"),
    product: g("product"), amount: g("amount"), stage: g("stage"),
    ts: new Date().toLocaleString("en-GB")
  };
}

function cleanBlocks(text) {
  return text
    .replace(/<<<SALES_EVENT>>>[\s\S]*?<<<END_SALES>>>/g, "")
    .replace(/<<<LEAD_CAPTURED>>>[\s\S]*?<<<END_LEAD>>>/g, "")
    .trim();
}

const STAGE_COLORS = {
  "Lead": "#1a4a8a", "Qualified": "#1a6b3c",
  "Application Submitted": "#7c4a00", "Cross-sell Suggested": "#5a1a7c",
  "Application Ready": "#006938"
};
const PRODUCT_LABELS = {
  PF: "Personal Finance", AF: "Auto Finance", HF: "Home Finance",
  CC: "Credit Card", Insurance: "Insurance", Investment: "Investment", Account: "Account"
};

function Tag({ label, color }) {
  const c = color || G;
  return (
    <span style={{ background: c+"22", color: c, border: "1px solid "+c+"44", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.4 }}>
      {label}
    </span>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "12px 16px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, animation: "kb 1.2s "+i*0.2+"s infinite ease-in-out" }} />
      ))}
    </div>
  );
}

function LeadCard({ lead, onDownload }) {
  const fields = [
    ["Name", lead.name], ["Phone", lead.phone], ["Nationality", lead.nationality],
    ["Salary", lead.salary], ["Employer", lead.employer], ["Iqama Expiry", lead.iqama],
    ["Product", lead.product], ["Amount", lead.amount]
  ];
  return (
    <div style={{ background: "linear-gradient(135deg,#0a2818,#0d3320)", border: "1.5px solid "+GOLD, borderRadius: 14, padding: 18, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, color: "#fff", fontWeight: 700 }}>V</div>
        <div>
          <div style={{ color: GOLD, fontWeight: 700, fontSize: 13 }}>Application Ready</div>
          <div style={{ color: "#8fa89a", fontSize: 11 }}>Lead captured - download to activate</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
        {fields.map(([lbl, val]) => (
          <div key={lbl} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 10px" }}>
            <div style={{ color: "#6b8a7a", fontSize: 10, marginBottom: 2 }}>{lbl}</div>
            <div style={{ color: "#e8f0ec", fontSize: 12, fontWeight: 600 }}>{val || "-"}</div>
          </div>
        ))}
      </div>
      <button onClick={onDownload} style={{ width: "100%", background: "linear-gradient(135deg,"+GOLD+",#a8863c)", border: "none", borderRadius: 10, padding: "10px 0", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 13 }}>
        Download Activation Excel
      </button>
    </div>
  );
}

function SalesCard({ ev }) {
  const sc = STAGE_COLORS[ev.stage] || G;
  return (
    <div style={{ background: CARD_BG, border: "1px solid "+BORDER, borderLeft: "3px solid "+sc, borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Tag label={ev.stage} color={sc} />
        <Tag label={ev.product} color={GOLD} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {[["Customer", ev.name], ["Type", ev.type], ["Salary", "SAR "+ev.salary], ["Iqama", ev.iqamaMonths+" months"]].map(([lbl, val]) => (
          <div key={lbl}>
            <span style={{ color: "#6b8a7a", fontSize: 10 }}>{lbl}: </span>
            <span style={{ color: "#c8dcd2", fontSize: 11 }}>{val || "-"}</span>
          </div>
        ))}
      </div>
      {ev.crossSell && ev.crossSell !== "None" && <div style={{ marginTop: 8, color: GOLD, fontSize: 11 }}>Cross-sell: {ev.crossSell}</div>}
      {ev.flags && ev.flags !== "None" && <div style={{ marginTop: 6, color: "#e07c40", fontSize: 11 }}>Warning: {ev.flags}</div>}
    </div>
  );
}

function CRMDashboard({ events, leads, onExport }) {
  const total = events.length;
  const qualified = events.filter(e => ["Qualified","Application Ready","Application Submitted"].includes(e.stage)).length;
  const wc = events.filter(e => e.type && e.type.toLowerCase().includes("white")).length;
  const bc = events.filter(e => e.type && e.type.toLowerCase().includes("blue")).length;
  const flagged = events.filter(e => e.flags && e.flags !== "None").length;
  const totalSAR = events.reduce((s,e) => s + (parseInt((e.amount||"").replace(/\D/g,"")) || 0), 0);
  const productCounts = {};
  events.forEach(e => { if(e.product) productCounts[e.product] = (productCounts[e.product]||0)+1; });

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>CRM Dashboard</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[["Total Leads", total, G], ["Qualified", qualified, "#1a6b3c"], ["Flagged", flagged, "#b04a10"]].map(([lbl,val,c]) => (
          <div key={lbl} style={{ background: c+"18", border: "1px solid "+c+"33", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ color: c, fontSize: 20, fontWeight: 700 }}>{val}</div>
            <div style={{ color: "#6b8a7a", fontSize: 10 }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[["White Collar", wc, "#1a3a6b", "#6ab0f5"], ["Blue Collar", bc, "#5a3a00", "#f5b06a"]].map(([lbl,val,bg,fg]) => (
          <div key={lbl} style={{ background: bg+"22", border: "1px solid "+bg+"44", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ color: fg, fontSize: 18, fontWeight: 700 }}>{val}</div>
            <div style={{ color: "#6b8a7a", fontSize: 10 }}>{lbl}</div>
          </div>
        ))}
      </div>
      {Object.keys(productCounts).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#6b8a7a", fontSize: 10, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Product Breakdown</div>
          {Object.entries(productCounts).map(([p,c]) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ color: "#c8dcd2", fontSize: 12, width: 130, flexShrink: 0 }}>{PRODUCT_LABELS[p]||p}</div>
              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: ((c/total)*100)+"%", height: "100%", background: G, borderRadius: 4 }} />
              </div>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, width: 20, textAlign: "right" }}>{c}</div>
            </div>
          ))}
        </div>
      )}
      {totalSAR > 0 && (
        <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid "+GOLD+"33", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ color: "#6b8a7a", fontSize: 10 }}>Total Finance Requested</div>
          <div style={{ color: GOLD, fontSize: 18, fontWeight: 700 }}>SAR {totalSAR.toLocaleString()}</div>
        </div>
      )}
      {leads.length > 0
        ? <button onClick={onExport} style={{ width: "100%", background: "linear-gradient(135deg,"+G+",#004d29)", border: "1px solid "+GOLD+"55", borderRadius: 10, padding: "10px 0", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 12 }}>Export All {leads.length} Leads to Excel</button>
        : <div style={{ color: "#3a5a4a", fontSize: 12, textAlign: "center", padding: "10px 0" }}>No leads ready for export yet</div>
      }
    </div>
  );
}

function FollowUpPanel({ events }) {
  const reminders = [
    ...events.filter(e => e.flags && e.flags !== "None").map(e => ({ icon: "!", text: e.name+": "+e.flags, color: "#e07c40" })),
    ...events.filter(e => parseInt(e.iqamaMonths) <= 3 && parseInt(e.iqamaMonths) > 0).map(e => ({ icon: "I", text: e.name+": Iqama expires in "+e.iqamaMonths+" months", color: "#c9a84c" }))
  ];
  const checklist = ["Valid Iqama verified","Salary transfer confirmed to Al Rajhi","Employment letter on file","SAMA credit check passed","AML screening completed","Data privacy consent (PDPL) obtained"];
  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Follow-up and Compliance</div>
      {reminders.length === 0
        ? <div style={{ color: "#3a5a4a", fontSize: 13, textAlign: "center", padding: 20 }}>No pending follow-ups</div>
        : reminders.map((r,i) => (
          <div key={i} style={{ background: r.color+"12", border: "1px solid "+r.color+"33", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: r.color, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{r.icon}</span>
            <span style={{ color: r.color, fontSize: 12 }}>{r.text}</span>
          </div>
        ))
      }
      <div style={{ marginTop: 16, background: CARD_BG, border: "1px solid "+BORDER, borderRadius: 10, padding: 14 }}>
        <div style={{ color: "#6b8a7a", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>KYC Compliance Checklist</div>
        {checklist.map((item,i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid "+G, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: G }}>v</span>
            </div>
            <span style={{ color: "#a0bfad", fontSize: 11 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowPanel() {
  const steps = [
    { label: "Lead Generation", desc: "Social media, referrals, walk-in, inbound queries" },
    { label: "Qualification", desc: "Check eligibility: salary, Iqama, employer type" },
    { label: "Product Pitch", desc: "Tailored to customer financial goals and profile" },
    { label: "Onboarding and KYC", desc: "Forms, documents, compliance verification" },
    { label: "After-Sales Service", desc: "Follow-ups, renewals, cross-sell check-ins" }
  ];
  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Sales and Service Workflow</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["Acquisition","#1a3a6b"],["Service","#1a6b3c"],["Cross-Sell","#6b1a1a"]].map(([lbl,c]) => (
          <div key={lbl} style={{ flex: 1, background: c+"22", border: "1px solid "+c+"44", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ color: "#c8dcd2", fontSize: 11, fontWeight: 600 }}>{lbl}</div>
          </div>
        ))}
      </div>
      {steps.map((step,i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: G+"33", border: "1px solid "+G+"66", display: "flex", alignItems: "center", justifyContent: "center", color: "#a8d4b8", fontWeight: 700, fontSize: 13 }}>{i+1}</div>
            {i < steps.length-1 && <div style={{ width: 1, height: 18, background: G+"44", marginTop: 3 }} />}
          </div>
          <div style={{ paddingTop: 6 }}>
            <div style={{ color: "#e8f0ec", fontSize: 12, fontWeight: 600 }}>{step.label}</div>
            <div style={{ color: "#6b8a7a", fontSize: 11, marginTop: 2 }}>{step.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApiKeyGate({ onKey }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const test = async () => {
    if (!val || val.length < 20) { setErr("Please enter a valid Gemini API key"); return; }
    setLoading(true); setErr("");
    try {
      const text = await callGemini(val, [{ role: "user", content: "hi" }]);
      if (text) { sessionStorage.setItem("arb_gemini_key", val); onKey(val); }
    } catch(e) {
      setErr(e.message && e.message.includes("API_KEY_INVALID") ? "Invalid API key - please check and try again" : "Error: " + e.message);
    }
    setLoading(false);
  };

  const steps = [
    "1. Go to aistudio.google.com",
    "2. Sign in with your Google account",
    "3. Click Get API Key then Create API key",
    "4. Copy and paste it below"
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DARK, padding: 20 }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 32px", maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,"+G+",#004d29)", border: "2px solid "+GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 18px" }}>
          <span style={{ fontSize: 28 }}>&#127968;</span>
        </div>
        <div style={{ fontFamily: "serif", color: GOLD, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Al Rajhi Bank</div>
        <div style={{ color: "#e0ece6", fontSize: 17, fontWeight: 600, marginBottom: 6 }}>RM Agent - Khalid</div>
        <div style={{ color: "#5a7a6a", fontSize: 13, marginBottom: 6, lineHeight: 1.6 }}>Powered by Google Gemini - 100% Free</div>
        <div style={{ background: "rgba(0,105,56,0.1)", border: "1px solid "+G+"44", borderRadius: 12, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>How to get your FREE Gemini API key:</div>
          {steps.map((s,i) => (
            <div key={i} style={{ color: "#a8d4b8", fontSize: 12, marginBottom: 4 }}>{s}</div>
          ))}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            style={{ display: "inline-block", marginTop: 8, background: GOLD, color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 8, textDecoration: "none" }}>
            Open Google AI Studio
          </a>
        </div>
        <input
          type="password" value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && test()}
          placeholder="Paste your Gemini API key here..."
          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 14px", color: "#e8f0ec", fontSize: 13, fontFamily: "monospace", marginBottom: 10, boxSizing: "border-box" }}
        />
        {err && <div style={{ color: "#e07c40", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <button onClick={test} disabled={loading || !val}
          style={{ width: "100%", background: "linear-gradient(135deg,"+G+",#004d29)", border: "2px solid "+GOLD, borderRadius: 12, padding: "13px 0", cursor: val && !loading ? "pointer" : "not-allowed", color: "#fff", fontWeight: 700, fontSize: 14, opacity: val && !loading ? 1 : 0.5 }}>
          {loading ? "Verifying key..." : "Launch Khalid"}
        </button>
        <div style={{ marginTop: 12, color: "#3a5a4a", fontSize: 11 }}>Your key stays in your browser only. Never stored on any server.</div>
      </div>
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("arb_gemini_key") || "");
  const [panel, setPanel] = useState("chat");
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [events, setEvents] = useState([]);
  const [leads, setLeads] = useState([]);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { bottomRef.current && bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const handleStart = async () => {
    setStarted(true); setLoading(true);
    try {
      const raw = await callGemini(apiKey, [{ role: "user", content: "Hello" }]);
      setMsgs([{ role: "assistant", content: raw }]);
    } catch {
      setMsgs([{ role: "assistant", content: "Ahlan wa sahlan! I am Khalid from Al Rajhi Bank. How can I help you today?" }]);
    }
    setLoading(false);
  };

  const sendMsg = async (override) => {
    const text = override || input.trim();
    if (!text || loading) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    const newMsgs = [...msgs, { role: "user", content: text }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const raw = await callGemini(apiKey, newMsgs);
      const ev = parseSalesEvent(raw);
      const lead = parseLead(raw);
      const clean = cleanBlocks(raw);
      if (ev) setEvents(p => [...p, ev]);
      if (lead) setLeads(p => [...p, lead]);
      setMsgs(p => [...p, { role: "assistant", content: clean, ev, lead }]);
    } catch(e) {
      setMsgs(p => [...p, { role: "assistant", content: "Sorry, there was an error: " + e.message }]);
    }
    setLoading(false);
    setTimeout(() => taRef.current && taRef.current.focus(), 100);
  };

  const exportCSV = (targetLeads) => {
    const hdrs = ["Full Name","Phone","Nationality","Monthly Salary","Employer","Iqama Expiry","Product","Amount Requested","Stage","Timestamp"];
    const rows = targetLeads.map(l => [l.name,l.phone,l.nationality,l.salary,l.employer,l.iqama,l.product,l.amount,l.stage,l.ts]);
    const csv = [hdrs,...rows].map(r => r.map(c => '"'+String(c||"").replace(/"/g,'""')+'"').join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AlRajhi_Leads_"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!apiKey) return <ApiKeyGate onKey={k => { sessionStorage.setItem("arb_gemini_key", k); setApiKey(k); }} />;

  const quickReplies = ["I need a personal loan","I want to finance a car","Buy property in my home country","Apply for a credit card","I have a complaint"];
  const tabs = [
    { id: "chat", label: "Chat", badge: 0 },
    { id: "crm", label: "CRM", badge: events.length },
    { id: "followup", label: "Follow-Up", badge: events.filter(e => e.flags && e.flags !== "None").length },
    { id: "workflow", label: "Workflow", badge: 0 }
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:` + DARK + `;}
        @keyframes kb{0%,80%,100%{transform:scale(0.6);opacity:0.4;}40%{transform:scale(1);opacity:1;}}
        @keyframes fu{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,.35);}50%{box-shadow:0 0 0 10px rgba(201,168,76,0);}}
        .bubble{animation:fu .28s ease forwards;}
        textarea{resize:none;font-family:inherit;}
        textarea:focus,button:focus,input:focus{outline:none;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#2a4a38;border-radius:3px;}
      `}</style>
      <div style={{ fontFamily: "'Sora', sans-serif", background: DARK, minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 820, margin: "0 auto" }}>

        <div style={{ background: "linear-gradient(135deg,"+G+",#004d29,#003a1e)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid "+GOLD, position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,"+GOLD+",#a87f2a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 700, color: "#fff", animation: started ? "pulse 2.5s infinite" : "none" }}>K</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Khalid - RM Agent</div>
            <div style={{ color: "#a8d4b8", fontSize: 11 }}>{started ? (loading ? "typing..." : "Online - Al Rajhi Bank") : "Powered by Google Gemini - Free"}</div>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 7, padding: "3px 10px", fontSize: 11, color: GOLD, fontWeight: 700 }}>Al Rajhi Bank</div>
            {leads.length > 0 && (
              <button onClick={() => exportCSV(leads)} style={{ background: GOLD, border: "none", borderRadius: 6, padding: "3px 9px", cursor: "pointer", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                Export ({leads.length})
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", background: "#0a1420", borderBottom: "1px solid "+BORDER, padding: "0 4px" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setPanel(t.id)}
              style={{ flex: 1, background: "none", border: "none", borderBottom: panel === t.id ? "2px solid "+GOLD : "2px solid transparent", padding: "10px 4px", cursor: "pointer", color: panel === t.id ? GOLD : "#6b8a7a", fontSize: 11, fontWeight: panel === t.id ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all .2s" }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{ background: t.id === "followup" ? "#e07c40" : G, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {panel !== "chat" && (
          <div style={{ flex: 1, overflowY: "auto", background: "#080f1c" }}>
            {panel === "crm" && <CRMDashboard events={events} leads={leads} onExport={() => exportCSV(leads)} />}
            {panel === "followup" && <FollowUpPanel events={events} />}
            {panel === "workflow" && <WorkflowPanel />}
          </div>
        )}

        {panel === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 12, minHeight: 380 }}>
              {!started ? (
                <div style={{ margin: "auto", textAlign: "center", padding: "36px 20px" }}>
                  <div style={{ width: 76, height: 76, margin: "0 auto 18px", background: "linear-gradient(135deg,"+G+",#004d29)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, border: "3px solid "+GOLD }}>
                    <span style={{ fontSize: 34 }}>&#127968;</span>
                  </div>
                  <div style={{ color: GOLD, fontSize: 21, fontWeight: 700, marginBottom: 6 }}>Welcome to Al Rajhi Bank</div>
                  <div style={{ color: "#e0ece6", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Meet Khalid - Your AI Relationship Manager</div>
                  <div style={{ color: "#5a7a6a", fontSize: 13, lineHeight: 1.7, maxWidth: 340, margin: "0 auto 26px" }}>
                    Acquisition, service, cross-selling, and compliance - all in one place.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginBottom: 22 }}>
                    {["Acquisition","Service","Cross-Sell","KYC Compliance","Sales Tracking"].map(f => (
                      <span key={f} style={{ background: G+"22", border: "1px solid "+G+"44", borderRadius: 20, padding: "4px 12px", color: "#a8d4b8", fontSize: 11 }}>{f}</span>
                    ))}
                  </div>
                  <button onClick={handleStart} style={{ background: "linear-gradient(135deg,"+G+",#004d29)", border: "2px solid "+GOLD, borderRadius: 14, padding: "13px 38px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 20px "+G+"66" }}>
                    Start with Khalid
                  </button>
                </div>
              ) : (
                <>
                  {msgs.map((m,i) => (
                    <div key={i} className="bubble" style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 9 }}>
                      {m.role === "assistant" && (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,"+GOLD+",#a87f2a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>K</div>
                      )}
                      <div style={{ maxWidth: "74%" }}>
                        <div style={{ background: m.role === "user" ? "linear-gradient(135deg,"+G+",#004d29)" : CARD_BG, border: m.role === "user" ? "none" : "1px solid "+BORDER, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "11px 15px", color: "#e8f0ec", fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                          {m.content}
                        </div>
                        {m.ev && <SalesCard ev={m.ev} />}
                        {m.lead && <LeadCard lead={m.lead} onDownload={() => exportCSV([m.lead])} />}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="bubble" style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,"+GOLD+",#a87f2a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>K</div>
                      <div style={{ background: CARD_BG, border: "1px solid "+BORDER, borderRadius: "18px 18px 18px 4px" }}>
                        <TypingDots />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {started && msgs.length <= 1 && !loading && (
              <div style={{ padding: "0 14px 10px", display: "flex", gap: 7, flexWrap: "wrap" }}>
                {quickReplies.map(q => (
                  <button key={q} onClick={() => sendMsg(q)} style={{ background: G+"18", border: "1px solid "+G+"44", borderRadius: 20, padding: "7px 13px", cursor: "pointer", color: "#a8d4b8", fontSize: 11, fontWeight: 500 }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {started && (
              <div style={{ padding: "10px 14px 18px", background: "rgba(6,14,26,.97)", borderTop: "1px solid "+BORDER, display: "flex", gap: 9, alignItems: "flex-end" }}>
                <textarea
                  ref={taRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 110)+"px"; }}
                  placeholder="Type a message... (Enter to send)"
                  rows={1}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid "+BORDER, borderRadius: 13, padding: "11px 15px", color: "#e8f0ec", fontSize: 13, maxHeight: 110, overflowY: "auto" }}
                />
                <button onClick={() => sendMsg()} disabled={!input.trim() || loading}
                  style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: input.trim() && !loading ? "linear-gradient(135deg,"+G+",#004d29)" : "rgba(255,255,255,0.07)", cursor: input.trim() && !loading ? "pointer" : "not-allowed", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
