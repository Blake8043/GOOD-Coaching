import { useEffect, useMemo, useState } from "react";
import { FaCheck, FaComments, FaEnvelope, FaPaperPlane, FaReceipt, FaTimes } from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function Messages({ embedded = false }) {
  const { token, user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState({ amount: "", discountPercent: 0, scope: "" });

  const load = async () => {
    const data = await api.get("/inquiries/my", token);
    setRows(data || []);
    setSelected((current) => data?.find((item) => item._id === current?._id) || data?.[0] || null);
  };

  useEffect(() => {
    load().catch((error) => push(error.message, "error"));
    const interval = window.setInterval(() => load().catch(() => {}), 5000);
    return () => window.clearInterval(interval);
  }, [token]);

  const isCoach = useMemo(() => selected && String(selected.coachId?.userId?._id || selected.coachId?.userId) === String(user?._id || user?.id), [selected, user]);
  const openCount = rows.filter((row) => ["open", "quoted"].includes(row.status)).length;
  const sentQuotes = rows.filter((row) => row.quote?.status === "sent").length;

  const action = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (error) { push(error.message || "That action could not be completed.", "error"); } finally { setBusy(false); }
  };
  const send = () => action(async () => { if (!message.trim() || !selected) return; const row = await api.post(`/inquiries/${selected._id}/messages`, { message }, token); setSelected(row); setMessage(""); await load(); });
  const sendQuote = () => action(async () => { const row = await api.post(`/inquiries/${selected._id}/quote`, quote, token); setSelected(row); push("Quote sent for customer approval.", "success"); await load(); });
  const approve = () => action(async () => { const result = await api.post(`/inquiries/${selected._id}/quote/approve`, {}, token); setSelected(result.inquiry); push(result.paymentNextStep, "success"); await load(); });
  const decline = () => action(async () => { const row = await api.post(`/inquiries/${selected._id}/quote/decline`, { message: "I declined this quote. Please revise it or message me to discuss the scope." }, token); setSelected(row); push("Quote declined. The coach can revise and resend it.", "success"); await load(); });
  const payQuote = () => action(async () => { const result = await api.post(`/payments/quotes/${selected._id}/checkout`, {}, token); if (result.checkoutUrl) window.location.href = result.checkoutUrl; });

  return <div className={embedded ? "" : "pp-page min-h-screen px-6 pt-28 pb-16"}><div className={embedded ? "" : "mx-auto max-w-7xl"}>
    <header className="mb-6 rounded-[2rem] border border-[#12372a]/10 bg-white/92 p-7 shadow-xl"><p className="text-xs font-black uppercase tracking-[.22em] text-[#087f73]">Personalized requests</p><div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-3xl font-black text-[#12372a] md:text-4xl">Coach conversations & quotes</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#40584f]">Combine services, discuss the details, and approve or decline the coach's final quote before making a payment.</p></div><div className="flex gap-3"><Metric label="Open conversations" value={openCount} /><Metric label="Quotes to review" value={sentQuotes} /></div></div></header>
    <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
      <aside className="rounded-3xl border border-[#12372a]/10 bg-white p-4 shadow-lg"><h2 className="mb-3 flex items-center gap-2 font-black text-[#12372a]"><FaComments/> Conversations</h2>{rows.length ? rows.map((row) => { const coachView = String(row.coachId?.userId?._id || row.coachId?.userId) === String(user?._id || user?.id); return <button key={row._id} onClick={() => setSelected(row)} className={`mb-2 w-full rounded-2xl border p-4 text-left transition ${selected?._id === row._id ? "border-[#00a896] bg-[#eaf9f7] shadow-sm" : "border-[#12372a]/10 bg-white hover:bg-[#fff8e7]"}`}><div className="flex justify-between gap-2"><b className="text-[#12372a]">{coachView ? row.playerId?.fullName : row.coachId?.displayName}</b><Status value={row.quote?.status !== "draft" ? row.quote?.status : row.status} /></div><div className="mt-1 text-sm font-semibold text-[#40584f]">{row.subject}</div><div className="mt-2 flex flex-wrap gap-1">{row.requestedServices?.slice(0, 3).map((service) => <span key={service} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#087f73]">{service}</span>)}</div></button>; }) : <div className="rounded-2xl bg-[#fff8e7] p-5 text-sm leading-6 text-[#40584f]">Open any coach profile and choose <b>Personalized Request</b> to start a conversation.</div>}</aside>
      <main className="rounded-3xl border border-[#12372a]/10 bg-white p-5 shadow-lg">{selected ? <>
        <div className="flex flex-wrap justify-between gap-3 border-b border-[#12372a]/10 pb-4"><div><h2 className="text-2xl font-black text-[#12372a]">{selected.subject}</h2><span className="text-sm font-bold text-[#087f73]">{selected.coachId?.presenceStatus === "online" ? "Coach online now" : "Coach offline - messages are saved"}</span></div>{selected.coachId?.contactEmail && <a href={`mailto:${selected.coachId.contactEmail}`} className="pp-btn-secondary px-4 py-2"><FaEnvelope className="mr-2"/>Email coach</a>}</div>
        {!!selected.requestedServices?.length && <section className="mt-4 rounded-2xl border border-[#00a896]/20 bg-[#eaf9f7] p-4"><div className="text-xs font-black uppercase tracking-[.15em] text-[#087f73]">Requested training</div><div className="mt-2 flex flex-wrap gap-2">{selected.requestedServices.map((service) => <span key={service} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#12372a]">{service}</span>)}</div></section>}
        <div className="my-5 max-h-96 space-y-3 overflow-auto rounded-2xl bg-[#f8fbf9] p-3">{selected.messages?.map((item) => <div key={item._id} className={`rounded-2xl p-4 ${String(item.senderId) === String(user?._id || user?.id) ? "ml-8 bg-[#d9f7fb]" : "mr-8 bg-white shadow-sm"}`}><p className="whitespace-pre-wrap text-sm leading-6 text-[#12372a]">{item.body}</p></div>)}</div>
        <div className="flex gap-2"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="pp-input px-4 py-3" placeholder="Ask about goals, deliverables, timing, or scope..."/><button onClick={send} disabled={busy || !message.trim()} className="pp-btn-primary px-5"><FaPaperPlane/></button></div>
        {selected.quote?.status && selected.quote.status !== "draft" && <section className="mt-5 rounded-2xl border border-[#00a896]/30 bg-[#d9f7fb] p-5 text-[#12372a]"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-black"><FaReceipt className="mr-2 inline"/>Custom quote: ${Number(selected.quote.amount || 0).toFixed(2)}</h3><Status value={selected.quote.status}/></div>{selected.quote.discountPercent > 0 && <p className="mt-1 text-sm font-bold text-[#087f73]">Includes {selected.quote.discountPercent}% package discount</p>}<p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selected.quote.scope}</p>{!isCoach && selected.quote.status === "sent" && <div className="mt-4 flex flex-wrap gap-3"><button onClick={approve} disabled={busy} className="pp-btn-primary px-4 py-2"><FaCheck className="mr-2"/>Approve quote</button><button onClick={decline} disabled={busy} className="pp-btn-secondary px-4 py-2"><FaTimes className="mr-2"/>Decline & request changes</button></div>}{!isCoach && selected.quote.status === "approved" && <button onClick={payQuote} disabled={busy} className="pp-btn-primary mt-4 px-4 py-2">Pay approved quote securely</button>}</section>}
        {isCoach && <section className="mt-5 rounded-2xl border border-[#12372a]/10 bg-[#fffdf6] p-5"><h3 className="font-black text-[#12372a]">Create or revise the final quote</h3><p className="mt-1 text-sm text-[#40584f]">Include all selected services, deliverables, timing, and any package discount.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><input className="pp-input px-4 py-3" type="number" min="0" value={quote.amount} onChange={(e) => setQuote((current) => ({ ...current, amount: e.target.value }))} placeholder="Final quote amount"/><input className="pp-input px-4 py-3" type="number" min="0" max="100" value={quote.discountPercent} onChange={(e) => setQuote((current) => ({ ...current, discountPercent: e.target.value }))} placeholder="Package discount %"/><textarea className="pp-input px-4 py-3 md:col-span-2" rows={4} value={quote.scope} onChange={(e) => setQuote((current) => ({ ...current, scope: e.target.value }))} placeholder="Final scope, selected services, deliverables, and turnaround time"/></div><button onClick={sendQuote} disabled={busy || !quote.amount} className="pp-btn-primary mt-3 px-4 py-2">Send quote for approval</button></section>}
      </> : <div className="py-24 text-center text-[#5f746c]">Select a conversation to view messages and quote details.</div>}</main>
    </div>
  </div></div>;
}

function Metric({ label, value }) { return <div className="min-w-32 rounded-2xl bg-[#eaf9f7] px-4 py-3"><div className="text-2xl font-black text-[#12372a]">{value}</div><div className="text-xs font-bold text-[#40584f]">{label}</div></div>; }
function Status({ value }) { return <span className="h-fit rounded-full bg-[#c6ff4a] px-2.5 py-1 text-[10px] font-black uppercase text-[#12372a]">{value || "open"}</span>; }
