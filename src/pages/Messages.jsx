import { useEffect, useMemo, useState } from "react";
import { FaArchive, FaCheck, FaComments, FaEnvelope, FaPaperPlane, FaReceipt, FaTimes, FaTrash } from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

function userId(value) {
  return String(value?._id || value?.id || value || "");
}

function isCoachFor(row, user) {
  return userId(row?.coachId?.userId) === userId(user);
}

export default function Messages({ embedded = false }) {
  const { token, user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [quote, setQuote] = useState({ amount: "", discountPercent: 0, scope: "", deliverables: "", uploadInstructions: "", splitRecipients: [] });

  const load = async () => {
    const [data, coaches] = await Promise.all([
      api.get(`/inquiries/my${showArchived ? "?archived=1" : ""}`, token),
      api.get("/coaches", token).catch(() => []),
    ]);
    const normalized = Array.isArray(data) ? data : [];
    setRows(normalized);
    setAvailableCoaches(Array.isArray(coaches) ? coaches : []);
    setSelected((current) => normalized.find((item) => item._id === current?._id) || normalized[0] || null);
  };

  useEffect(() => {
    load().catch((error) => push(error.message, "error"));
    const interval = window.setInterval(() => load().catch(() => {}), 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, showArchived]);

  useEffect(() => {
    if (!selected?._id) return;
    api.post(`/inquiries/${selected._id}/read`, {}, token).catch(() => {});
    setQuote({
      amount: selected.quote?.amount || "",
      discountPercent: selected.quote?.discountPercent || 0,
      scope: selected.quote?.scope || "",
      deliverables: selected.quote?.deliverables || "",
      uploadInstructions: selected.quote?.uploadInstructions || "",
      splitRecipients: selected.quote?.splitRecipients || [],
    });
  }, [selected?._id, token]);

  const isCoach = useMemo(() => selected && isCoachFor(selected, user), [selected, user]);
  const openCount = rows.filter((row) => ["open", "quoted", "approved"].includes(row.status)).length;
  const unreadCount = rows.reduce((sum, row) => sum + Number(row.unreadCount || 0), 0);

  const action = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      push(error.message || "That action could not be completed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const send = () => action(async () => {
    if (!message.trim() || !selected) return;
    const row = await api.post(`/inquiries/${selected._id}/messages`, { message }, token);
    setSelected(row);
    setMessage("");
    await load();
  });

  const sendQuote = () => action(async () => {
    const splitRecipients = (quote.splitRecipients || []).filter((item) => item.coachId && Number(item.percentage || 0) > 0);
    const row = await api.post(`/inquiries/${selected._id}/quote`, { ...quote, splitRecipients }, token);
    setSelected(row);
    push("Quote sent for customer approval.", "success");
    await load();
  });

  const approve = () => action(async () => {
    const result = await api.post(`/inquiries/${selected._id}/quote/approve`, {}, token);
    setSelected(result.inquiry);
    push(result.paymentNextStep, "success");
    await load();
  });

  const decline = () => action(async () => {
    const row = await api.post(`/inquiries/${selected._id}/quote/decline`, { message: "I declined this quote. Please revise it or message me to discuss the scope." }, token);
    setSelected(row);
    push("Quote declined. The coach can revise and resend it.", "success");
    await load();
  });

  const payQuote = () => action(async () => {
    const result = await api.post(`/payments/quotes/${selected._id}/checkout`, {}, token);
    if (result.checkoutUrl) window.location.href = result.checkoutUrl;
  });

  const archiveSelected = () => action(async () => {
    if (!selected) return;
    await api.post(`/inquiries/${selected._id}/archive`, {}, token);
    push("Request moved out of the main inbox.", "success");
    setSelected(null);
    await load();
  });

  const deleteSelected = () => action(async () => {
    if (!selected || !window.confirm("Remove this request from your inbox? This does not delete it for the other person.")) return;
    await api.delete(`/inquiries/${selected._id}`, token);
    push("Request removed from your inbox.", "success");
    setSelected(null);
    await load();
  });

  const addSplit = () => setQuote((current) => ({ ...current, splitRecipients: [...(current.splitRecipients || []), { coachId: "", label: "", percentage: "" }] }));
  const updateSplit = (index, key, value) => setQuote((current) => ({
    ...current,
    splitRecipients: (current.splitRecipients || []).map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [key]: value };
      if (key === "coachId") {
        const coach = availableCoaches.find((row) => row._id === value);
        if (coach && !next.label) next.label = coach.displayName;
      }
      return next;
    }),
  }));
  const removeSplit = (index) => setQuote((current) => ({ ...current, splitRecipients: (current.splitRecipients || []).filter((_, i) => i !== index) }));

  return (
    <div className={embedded ? "" : "pp-page min-h-screen px-6 pt-28 pb-16"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl"}>
        <header className="mb-6 rounded-[2rem] border border-[#12372a]/10 bg-white/92 p-7 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#087f73]">Personalized requests</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-black text-[#12372a] md:text-4xl">Coach conversations & quotes</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#40584f]">
                Customers and coaches can message, approve quotes, pay, then upload videos after payment.
              </p>
            </div>
            <div className="flex gap-3"><Metric label="Open" value={openCount} /><Metric label="Unread" value={unreadCount} /></div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
          <aside className="rounded-3xl border border-[#12372a]/10 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-black text-[#12372a]"><FaComments /> Conversations</h2>
              <button type="button" onClick={() => setShowArchived((v) => !v)} className="rounded-full bg-[#eaf9f7] px-3 py-1 text-xs font-black text-[#087f73]">
                {showArchived ? "Hide old" : "Show old"}
              </button>
            </div>
            {rows.length ? rows.map((row) => {
              const coachView = isCoachFor(row, user);
              return (
                <button key={row._id} onClick={() => setSelected(row)} className={`mb-2 w-full rounded-2xl border p-4 text-left transition ${selected?._id === row._id ? "border-[#00a896] bg-[#eaf9f7] shadow-sm" : "border-[#12372a]/10 bg-white hover:bg-[#fff8e7]"}`}>
                  <div className="flex justify-between gap-2">
                    <b className="text-[#12372a]">{coachView ? row.playerId?.fullName || row.playerId?.email : row.coachId?.displayName}</b>
                    <Status value={row.quote?.status !== "draft" ? row.quote?.status : row.status} />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#40584f]">{row.subject}</div>
                  {row.unreadCount > 0 && <div className="mt-2 inline-flex rounded-full bg-[#ff7b54] px-2 py-1 text-[11px] font-black text-white">{row.unreadCount} unread</div>}
                </button>
              );
            }) : <div className="rounded-2xl bg-[#fff8e7] p-5 text-sm leading-6 text-[#40584f]">Open any coach profile and choose <b>Personalized Request</b> to start a conversation.</div>}
          </aside>

          <main className="rounded-3xl border border-[#12372a]/10 bg-white p-5 shadow-lg">
            {selected ? (
              <>
                <div className="flex flex-wrap justify-between gap-3 border-b border-[#12372a]/10 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#12372a]">{selected.subject}</h2>
                    <span className="text-sm font-bold text-[#087f73]">{selected.coachId?.presenceStatus === "online" ? "Coach online now" : "Messages are saved"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.coachId?.contactEmail && <a href={`mailto:${selected.coachId.contactEmail}`} className="pp-btn-secondary px-4 py-2"><FaEnvelope className="mr-2" />Email coach</a>}
                    <button onClick={archiveSelected} disabled={busy} className="pp-btn-secondary px-4 py-2"><FaArchive className="mr-2" />Move old</button>
                    <button onClick={deleteSelected} disabled={busy} className="rounded-full bg-[#ffebe5] px-4 py-2 font-black text-[#7a2b18]"><FaTrash className="mr-2 inline" />Remove</button>
                  </div>
                </div>

                <div className="my-5 max-h-96 space-y-3 overflow-auto rounded-2xl bg-[#f8fbf9] p-3">
                  {selected.messages?.map((item) => (
                    <div key={item._id} className={`rounded-2xl p-4 ${String(item.senderId) === userId(user) ? "ml-8 bg-[#d9f7fb]" : "mr-8 bg-white shadow-sm"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#12372a]">{item.body}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="pp-input px-4 py-3" placeholder="Ask about goals, deliverables, timing, or scope..." />
                  <button onClick={send} disabled={busy || !message.trim()} className="pp-btn-primary px-5"><FaPaperPlane /></button>
                </div>

                {selected.quote?.status && selected.quote.status !== "draft" && (
                  <section className="mt-5 rounded-2xl border border-[#00a896]/30 bg-[#d9f7fb] p-5 text-[#12372a]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl font-black"><FaReceipt className="mr-2 inline" />Custom quote: ${Number(selected.quote.amount || 0).toFixed(2)}</h3>
                      <Status value={selected.quote.status} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selected.quote.scope}</p>
                    {selected.quote.deliverables && <p className="mt-3 whitespace-pre-wrap text-sm leading-6"><b>Deliverables:</b> {selected.quote.deliverables}</p>}
                    {selected.quote.uploadInstructions && <p className="mt-3 whitespace-pre-wrap text-sm leading-6"><b>After payment upload instructions:</b> {selected.quote.uploadInstructions}</p>}
                    {!!selected.quote.splitRecipients?.length && (
                      <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold">
                        <b>Order-specific coach split:</b> {selected.quote.splitRecipients.map((row) => `${row.label || row.coachId?.displayName || "Coach"} ${row.percentage}%`).join(" / ")}
                      </div>
                    )}
                    {!isCoach && selected.quote.status === "sent" && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={approve} disabled={busy} className="pp-btn-primary px-4 py-2"><FaCheck className="mr-2" />Approve quote</button>
                        <button onClick={decline} disabled={busy} className="pp-btn-secondary px-4 py-2"><FaTimes className="mr-2" />Decline</button>
                      </div>
                    )}
                    {!isCoach && selected.quote.status === "approved" && <button onClick={payQuote} disabled={busy} className="pp-btn-primary mt-4 px-4 py-2">Pay approved quote securely</button>}
                  </section>
                )}

                {isCoach && (
                  <section className="mt-5 rounded-2xl border border-[#12372a]/10 bg-[#fffdf6] p-5">
                    <h3 className="font-black text-[#12372a]">Create or revise the final quote</h3>
                    <p className="mt-1 text-sm text-[#40584f]">
                      Order-specific split coaching is only set here on personalized requests. The customer approves this quote first, then pays, then uploads files/video after payment.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input className="pp-input px-4 py-3" type="number" min="0" value={quote.amount} onChange={(e) => setQuote((current) => ({ ...current, amount: e.target.value }))} placeholder="Final quote amount" />
                      <input className="pp-input px-4 py-3" type="number" min="0" max="100" value={quote.discountPercent} onChange={(e) => setQuote((current) => ({ ...current, discountPercent: e.target.value }))} placeholder="Package discount %" />
                      <textarea className="pp-input px-4 py-3 md:col-span-2" rows={4} value={quote.scope} onChange={(e) => setQuote((current) => ({ ...current, scope: e.target.value }))} placeholder="Final scope, selected services, and timing" />
                      <textarea className="pp-input px-4 py-3 md:col-span-2" rows={3} value={quote.deliverables} onChange={(e) => setQuote((current) => ({ ...current, deliverables: e.target.value }))} placeholder="Deliverables: video review, PDF notes, drills, strategy plan, etc." />
                      <textarea className="pp-input px-4 py-3 md:col-span-2" rows={3} value={quote.uploadInstructions} onChange={(e) => setQuote((current) => ({ ...current, uploadInstructions: e.target.value }))} placeholder="What the customer should upload after paying" />
                    </div>
                    <div className="mt-4 rounded-2xl border border-[#12372a]/10 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <b>Order-specific split coaches</b>
                        <button type="button" onClick={addSplit} className="rounded-full bg-[#eaf9f7] px-3 py-1 text-xs font-black text-[#087f73]">Add split</button>
                      </div>
                      {(quote.splitRecipients || []).map((split, index) => (
                        <div key={index} className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_.5fr_auto]">
                          <select className="pp-input px-3 py-2" value={userId(split.coachId)} onChange={(e) => updateSplit(index, "coachId", e.target.value)}>
                            <option value="">Select second coach</option>
                            {availableCoaches
                              .filter((coach) => coach._id !== selected.coachId?._id)
                              .map((coach) => <option key={coach._id} value={coach._id}>{coach.displayName}</option>)}
                          </select>
                          <input className="pp-input px-3 py-2" value={split.label || ""} onChange={(e) => updateSplit(index, "label", e.target.value)} placeholder="Label / coach name" />
                          <input className="pp-input px-3 py-2" type="number" min="1" max="100" value={split.percentage} onChange={(e) => updateSplit(index, "percentage", e.target.value)} placeholder="%" />
                          <button type="button" onClick={() => removeSplit(index)} className="rounded-full bg-[#ffebe5] px-3 py-2 text-[#7a2b18]"><FaTrash /></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={sendQuote} disabled={busy || !quote.amount} className="pp-btn-primary mt-3 px-4 py-2">Send quote for approval</button>
                  </section>
                )}
              </>
            ) : <div className="py-24 text-center text-[#5f746c]">Select a conversation to view messages and quote details.</div>}
          </main>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="min-w-32 rounded-2xl bg-[#eaf9f7] px-4 py-3"><div className="text-2xl font-black text-[#12372a]">{value}</div><div className="text-xs font-bold text-[#40584f]">{label}</div></div>;
}
function Status({ value }) {
  return <span className="h-fit rounded-full bg-[#c6ff4a] px-2.5 py-1 text-[10px] font-black uppercase text-[#12372a]">{String(value || "open").replaceAll("_", " ")}</span>;
}
