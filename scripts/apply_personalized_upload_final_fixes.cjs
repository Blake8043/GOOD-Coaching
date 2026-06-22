const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`updated ${file}`);
}
function replaceOnce(file, find, replace) {
  const src = read(file);
  if (!src.includes(find)) {
    console.warn(`SKIP ${file}: pattern not found`);
    return false;
  }
  write(file, src.replace(find, replace));
  return true;
}
function ensureIncludes(file, marker, insertAfter) {
  const src = read(file);
  if (src.includes(marker)) return false;
  if (!src.includes(insertAfter)) {
    console.warn(`SKIP ${file}: insert point not found`);
    return false;
  }
  write(file, src.replace(insertAfter, `${insertAfter}\n${marker}`));
  return true;
}

// 1) CoachProfile: add customer upload type selection to personalized request payload.
{
  const file = path.join("src", "pages", "CoachProfile.jsx");
  let src = read(file);

  if (!src.includes("FaFilePdf")) {
    src = src.replace("FaEnvelope,", "FaEnvelope,\n  FaFilePdf,");
    src = src.replace("FaYoutube,", "FaYoutube,\n  FaVideo,");
  }

  if (!src.includes("const [requestedUploadTypes")) {
    src = src.replace(
      "const [requestedServices, setRequestedServices] = useState([]);",
      'const [requestedServices, setRequestedServices] = useState([]);\n  const [requestedUploadTypes, setRequestedUploadTypes] = useState(["video"]);'
    );
  }

  if (!src.includes("const toggleUploadType = (type)")) {
    src = src.replace(
      "  const toggleRequestedService = (service) => {\n    setRequestedServices((current) =>\n      current.includes(service) ? current.filter((item) => item !== service) : [...current, service]\n    );\n  };",
      `  const toggleRequestedService = (service) => {
    setRequestedServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service]
    );
  };

  const toggleUploadType = (type) => {
    setRequestedUploadTypes((current) => {
      const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type];
      return next.length ? next : [type];
    });
  };

  const uploadTypeLabel = (types = requestedUploadTypes) => {
    if (types.includes("video") && types.includes("pdf")) return "Video + PDF";
    if (types.includes("pdf")) return "PDF/document";
    return "Video";
  };`
    );
  }

  src = src.replace(
    "if (!requestedServices.length) return push(\"Select at least one training service.\", \"error\");",
    'if (!requestedServices.length) return push("Select at least one training service.", "error");\n    if (!requestedUploadTypes.length) return push("Choose whether you plan to send video, PDF, or both.", "error");'
  );

  src = src.replace(
    "form.skillLevel && `Skill level: ${form.skillLevel}`,",
    'form.skillLevel && `Skill level: ${form.skillLevel}`,\n        `Customer plans to send after payment: ${uploadTypeLabel()}`,'
  );

  src = src.replace(
    "requestedServices,\n        },",
    "requestedServices,\n          requestedUploadTypes,\n        },"
  );

  if (!src.includes("What do you plan to send after payment?")) {
    src = src.replace(
      '<button onClick={sendCustomRequest} disabled={busy} className="pp-btn-primary mt-5 px-5 py-3">Submit personalized request</button>',
      `<div className="mt-5 rounded-2xl bg-white p-4">
                  <div className="font-black text-[#12372a]">What do you plan to send after payment?</div>
                  <p className="mt-1 text-sm font-semibold text-[#40584f]">Pick one or both. The coach can adjust this in the final quote.</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <button type="button" onClick={() => toggleUploadType("video")} className={\`rounded-2xl border p-4 text-left font-black \${requestedUploadTypes.includes("video") ? "border-[#087f73] bg-[#eaf9f7] text-[#087f73]" : "border-[#12372a]/10 text-[#40584f]"}\`}>
                      <FaVideo className="mr-2 inline" /> Video
                    </button>
                    <button type="button" onClick={() => toggleUploadType("pdf")} className={\`rounded-2xl border p-4 text-left font-black \${requestedUploadTypes.includes("pdf") ? "border-[#087f73] bg-[#eaf9f7] text-[#087f73]" : "border-[#12372a]/10 text-[#40584f]"}\`}>
                      <FaFilePdf className="mr-2 inline" /> PDF / document
                    </button>
                  </div>
                </div>
                <button onClick={sendCustomRequest} disabled={busy} className="pp-btn-primary mt-5 px-5 py-3">Submit personalized request</button>`
    );
  }

  write(file, src);
}

// 2) Messages: this file varies a lot, so append helper fields and guide coach quote payload.
// If the simple patterns miss, use README fallback.
{
  const file = path.join("src", "pages", "Messages.jsx");
  let src = read(file);

  if (!src.includes("FaFilePdf")) {
    src = src.replace("FaEnvelope,", "FaEnvelope,\n  FaFilePdf,");
    src = src.replace("FaReceipt,", "FaReceipt,\n  FaVideo,");
  }

  src = src.replace(
    'const [quote, setQuote] = useState({ amount: "", discountPercent: 0, scope: "", deliverables: "", uploadInstructions: "", splitRecipients: [] });',
    'const [quote, setQuote] = useState({ amount: "", discountPercent: 0, scope: "", deliverables: "", uploadInstructions: "", splitRecipients: [], requiredUploadTypes: ["video"], videoAdditionalCost: "", pdfAdditionalCost: "" });'
  );

  if (!src.includes("const toggleRequiredUploadType")) {
    src = src.replace(
      "  const send = () => action(async () => {",
      `  const toggleRequiredUploadType = (type) => {
    setQuote((current) => {
      const existing = Array.isArray(current.requiredUploadTypes) ? current.requiredUploadTypes : [];
      const next = existing.includes(type) ? existing.filter((item) => item !== type) : [...existing, type];
      return { ...current, requiredUploadTypes: next.length ? next : [type] };
    });
  };

  const uploadTypeLabel = (types = []) => {
    if (types.includes("video") && types.includes("pdf")) return "Video + PDF";
    if (types.includes("pdf")) return "PDF/document";
    return "Video";
  };

  const finalQuoteTotal = Number(quote.amount || 0) + Number(quote.videoAdditionalCost || 0) + Number(quote.pdfAdditionalCost || 0);

  const send = () => action(async () => {`
    );
  }

  src = src.replace(
    "const row = await api.post(`/inquiries/${selected._id}/quote`, { ...quote, splitRecipients }, token);",
    `const row = await api.post(
      \`/inquiries/\${selected._id}/quote\`,
      {
        ...quote,
        amount: Number(quote.amount || 0),
        requiredUploadTypes: quote.requiredUploadTypes?.length ? quote.requiredUploadTypes : ["video"],
        uploadOptionPrices: { video: Number(quote.videoAdditionalCost || 0), pdf: Number(quote.pdfAdditionalCost || 0) },
        splitRecipients,
      },
      token
    );`
  );

  if (!src.includes("Required customer upload after payment")) {
    src = src.replace(
      '<div className="mt-4 rounded-2xl border border-[#12372a]/10 bg-white p-4">',
      `<div className="mt-4 rounded-2xl border border-[#00a896]/20 bg-[#eaf9f7] p-4">
                      <div className="font-black text-[#12372a]">Required customer upload after payment</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <button type="button" onClick={() => toggleRequiredUploadType("video")} className={\`rounded-2xl border p-4 text-left font-black \${quote.requiredUploadTypes?.includes("video") ? "border-[#087f73] bg-white text-[#087f73]" : "border-[#12372a]/10 bg-white/60 text-[#40584f]"}\`}>
                          <FaVideo className="mr-2 inline" /> Video submission
                          <input className="pp-input mt-3 px-3 py-2" type="number" min="0" value={quote.videoAdditionalCost} onClick={(e) => e.stopPropagation()} onChange={(e) => setQuote((current) => ({ ...current, videoAdditionalCost: e.target.value }))} placeholder="Optional video add-on $" />
                        </button>
                        <button type="button" onClick={() => toggleRequiredUploadType("pdf")} className={\`rounded-2xl border p-4 text-left font-black \${quote.requiredUploadTypes?.includes("pdf") ? "border-[#087f73] bg-white text-[#087f73]" : "border-[#12372a]/10 bg-white/60 text-[#40584f]"}\`}>
                          <FaFilePdf className="mr-2 inline" /> PDF/document submission
                          <input className="pp-input mt-3 px-3 py-2" type="number" min="0" value={quote.pdfAdditionalCost} onClick={(e) => e.stopPropagation()} onChange={(e) => setQuote((current) => ({ ...current, pdfAdditionalCost: e.target.value }))} placeholder="Optional PDF add-on $" />
                        </button>
                      </div>
                      <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-black text-[#12372a]">Final quote total: $\{finalQuoteTotal.toFixed(2)}</div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-[#12372a]/10 bg-white p-4">`
    );
  }

  write(file, src);
}

console.log("Personalized upload/quote frontend patch attempted. Review git diff before committing.");
