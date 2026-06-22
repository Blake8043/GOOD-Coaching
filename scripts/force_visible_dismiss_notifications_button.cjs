const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`updated ${file}`);
}

function insertAfter(source, marker, insert) {
  if (!source.includes(marker)) {
    console.warn(`marker not found: ${marker.slice(0, 80)}...`);
    return source;
  }
  return source.replace(marker, `${marker}${insert}`);
}

const accountFile = path.join("src", "components", "AccountMenu.jsx");
let account = read(accountFile);

// 1) Make sure the import exists.
if (!account.includes("FaBellSlash")) {
  if (account.includes('import { FaCamera } from "react-icons/fa";')) {
    account = account.replace(
      'import { FaCamera } from "react-icons/fa";',
      'import { FaBellSlash, FaCamera } from "react-icons/fa";'
    );
  } else {
    account = account.replace(/import\s*\{([^}]+)\}\s*from "react-icons\/fa";/, (match, icons) => {
      return `import { ${icons.trim()}, FaBellSlash } from "react-icons/fa";`;
    });
  }
}

// 2) Make sure dismissBusy state exists.
if (!account.includes("const [dismissBusy")) {
  account = account.replace(
    /const \[uploadBusy,\s*setUploadBusy\]\s*=\s*useState\(false\);/,
    `const [uploadBusy, setUploadBusy] = useState(false);
  const [dismissBusy, setDismissBusy] = useState(false);`
  );
}

// 3) Remove any previous dismiss button block if it exists, so we don't duplicate hidden placements.
account = account.replace(
  /\n\s*<button[\s\S]*?Dismiss all notifications[\s\S]*?<\/button>\n/g,
  "\n"
);

// 4) Make sure function exists.
if (!account.includes("const dismissAllNotifications = async")) {
  const insertPoint = /const markNotificationsRead = async \(\) => \{[\s\S]*?\n\s*\};/;
  const match = account.match(insertPoint);
  const fn = `

  const dismissAllNotifications = async () => {
    if (!token || dismissBusy) return;

    setDismissBusy(true);
    try {
      await api.post("/notifications/dismiss-all", {}, token).catch(() => api.post("/notifications/mark-read", {}, token));
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
      if (typeof loadNotifications === "function") await loadNotifications();
    } catch {
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
    } finally {
      setDismissBusy(false);
    }
  };`;

  if (match) {
    account = account.replace(match[0], `${match[0]}${fn}`);
  } else {
    account = account.replace(
      "return (",
      `${fn}

  return (`
    );
  }
}

// 5) Insert a very visible button immediately after the top profile identity row.
// This placement is ABOVE upload profile picture and ABOVE all role links for every role.
const visibleButton = `
            <button
              type="button"
              onClick={dismissAllNotifications}
              disabled={dismissBusy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e63946] bg-[#e63946] px-4 py-3 text-sm font-black text-white shadow-[0_10px_20px_rgba(230,57,70,0.25)] transition hover:bg-[#c62839] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ color: "#ffffff" }}
            >
              <FaBellSlash />
              {dismissBusy ? "Clearing notifications..." : "Dismiss all notifications"}
            </button>
`;

if (!account.includes('border-[#e63946] bg-[#e63946]') && !account.includes("Clearing notifications...")) {
  // Most versions have the role badge span followed by </div> for the header row.
  const marker = `              <span style={roleBadgeStyle(role)} className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>`;
  if (account.includes(marker)) {
    account = insertAfter(account, marker, visibleButton);
  } else {
    // Fallback: put it at the top of the dropdown panel after the first bg header div opens.
    const fallback = /<div className="border-b border-\[#12372a\]\/10 bg-\[#d9f7fb\]\/50 px-4 py-4">/;
    account = account.replace(fallback, (m) => `${m}${visibleButton}`);
  }
} else if (!account.includes('border-[#e63946] bg-[#e63946]')) {
  // Previous button exists but weak styling; replace with this stronger one.
  account = account.replace(/<button[\s\S]*?Clearing notifications\.\.\.[\s\S]*?<\/button>/, visibleButton.trim());
}

// 6) Safety: if the button still did not insert, put it right before upload picture label.
if (!account.includes('border-[#e63946] bg-[#e63946]')) {
  const uploadLabel = `<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#087f73] ring-1 ring-[#12372a]/10 hover:bg-[#eaf9f7]">`;
  account = account.replace(uploadLabel, `${visibleButton}${uploadLabel}`);
}

write(accountFile, account);


// Backend endpoint patch
const notificationsFile = path.join("server", "routes", "notifications.js");
let route = read(notificationsFile);

if (!route.includes('"/dismiss-all"')) {
  const endpoint = `
router.post(
  "/dismiss-all",
  auth,
  asyncHandler(async (req, res) => {
    const uid = String(req.user?._id || req.user?.id || "");
    const now = new Date();

    await Notification.updateMany(
      { userId: uid, dismissedAt: null },
      { $set: { readAt: now, dismissedAt: now } }
    );

    const CoachProfile = require("../models/CoachProfile");
    const Inquiry = require("../models/Inquiry");

    const coach = await CoachProfile.findOne({ userId: uid }).select("_id");
    const filter = coach ? { $or: [{ playerId: uid }, { coachId: coach._id }] } : { playerId: uid };

    const rows = await Inquiry.find(filter).select("messages");
    await Promise.all(
      rows.map(async (row) => {
        let changed = false;
        row.messages.forEach((msg) => {
          const sender = String(msg.senderId || "");
          const alreadyRead = (msg.readBy || []).some((id) => String(id || "") === uid);
          if (sender !== uid && !alreadyRead) {
            msg.readBy.push(uid);
            changed = true;
          }
        });
        if (changed) await row.save();
      })
    );

    res.json({ ok: true, dismissed: true });
  })
);

`;

  if (route.includes("router.delete(")) {
    route = route.replace("router.delete(", `${endpoint}router.delete(`);
  } else {
    route = route.replace("module.exports = router;", `${endpoint}\nmodule.exports = router;`);
  }

  write(notificationsFile, route);
} else {
  console.log("server/routes/notifications.js already has /dismiss-all");
}

console.log("Forced visible dismiss button patch complete.");
