import { useState } from "react";
import { Link } from "react-router-dom";
import { FaClock, FaComments, FaEnvelope, FaLifeRing, FaShieldAlt, FaVideo } from "react-icons/fa";
import { api } from "../lib/api";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  topic: "Online coaching question",
  message: "",
};

const quickLinks = [
  { icon: <FaVideo />, title: "Video help", text: "Uploads are limited to 15 minutes." },
  { icon: <FaComments />, title: "Coach requests", text: "Use a coach profile for custom quotes." },
  { icon: <FaClock />, title: "Response time", text: "Please allow 1-3 business days." },
];

export default function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");

    try {
      await api.post("/contact", form);
      setForm(emptyForm);
      setStatus("Thanks. Your message was received. Please allow 1-3 business days for a response.");
    } catch (error) {
      setStatus(error.message || "Could not send your request right now. Please email blake@goodmanpickleball.com directly.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pp-page min-h-screen px-6 pt-28 pb-16">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/92 p-8 text-center shadow-xl md:p-10">
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#087f73]">
            Contact GOOD Coaching
          </p>

          <h1 className="mx-auto mt-8 max-w-3xl text-4xl font-black text-[#12372a] md:text-6xl">
            How can we help?
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#40584f]">
            Get help with accounts, coach profiles, personalized requests, payments, or video submissions.
          </p>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
            {quickLinks.map((item) => (
              <Quick key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-4xl">
          <form onSubmit={submit} className="rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-xl md:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-black text-[#12372a]">Send support a message</h2>

              <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#40584f]">
                For a personalized coaching quote, open a coach profile and choose Personalized Request.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  className="pp-input mt-1 px-4 py-3"
                  required
                />
              </Field>

              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  type="email"
                  className="pp-input mt-1 px-4 py-3"
                  required
                />
              </Field>

              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  type="tel"
                  className="pp-input mt-1 px-4 py-3"
                />
              </Field>

              <Field label="What do you need help with?">
                <select
                  value={form.topic}
                  onChange={(event) => update("topic", event.target.value)}
                  className="pp-input mt-1 px-4 py-3"
                >
                  <option>Online coaching question</option>
                  <option>Video upload support</option>
                  <option>Coach application question</option>
                  <option>Account access question</option>
                  <option>Payment or quote question</option>
                  <option>DUPR profile question</option>
                </select>
              </Field>

              <Field label="Message" wide>
                <textarea
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  rows={7}
                  className="pp-input mt-1 px-4 py-3"
                  required
                  placeholder="Include the page you were using and what you expected to happen."
                />
              </Field>
            </div>

            <button type="submit" disabled={busy} className="pp-btn-primary mt-5 w-full px-6 py-4 disabled:opacity-60">
              <FaEnvelope className="mr-2" />
              {busy ? "Sending..." : "Send support message"}
            </button>

            {status && (
              <p className="mt-4 rounded-2xl bg-[#eaf9f7] p-4 text-center text-sm font-bold text-[#205746]">
                {status}
              </p>
            )}
          </form>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-lg">
              <FaLifeRing className="text-3xl text-[#087f73]" />

              <h2 className="mt-4 text-xl font-black text-[#12372a]">Helpful reminders</h2>

              <div className="mt-5 space-y-4">
                <Reminder icon={<FaVideo />} text="Customer videos are limited to 15 minutes." />
                <Reminder icon={<FaClock />} text="Allow 1-3 business days for coach responses." />
                <Reminder icon={<FaShieldAlt />} text="Only approve and pay quotes you understand." />
                <Reminder icon={<FaEnvelope />} text="Keep your account email current for replies." />
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#d5b450]/30 bg-[#fff1c7] p-6 shadow-lg">
              <h3 className="font-black text-[#12372a]">Need a custom training plan?</h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-[#40584f]">
                Choose a coach, select multiple services in Personalized Request, and discuss the final quote in chat.
              </p>

              <Link to="/coaches" className="pp-btn-primary mt-4 w-full px-4 py-3 text-center text-sm">
                Browse coaches
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, wide, children }) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className="text-sm font-black text-[#12372a]">{label}</span>
      {children}
    </label>
  );
}

function Quick({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-[#12372a]/10 bg-[#eaf9f7] p-4 text-left shadow-sm">
      <div className="text-[#087f73]">{icon}</div>
      <div className="mt-2 text-sm font-black text-[#12372a]">{title}</div>
      <div className="text-xs font-semibold leading-5 text-[#40584f]">{text}</div>
    </div>
  );
}

function Reminder({ icon, text }) {
  return (
    <div className="flex gap-3 text-sm font-semibold leading-6 text-[#40584f]">
      <span className="mt-1 text-[#087f73]">{icon}</span>
      {text}
    </div>
  );
}