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

const accountFile = path.join("src", "components", "AccountMenu.jsx");
let account = read(accountFile);

// Add icon import.
if (!account.includes("FaBellSlash")) {
  if (account.includes('import { FaCamera } from "react-icons/fa";')) {
    account = account.replace('import { FaCamera } from "react-icons/fa";', 'import { FaBellSlash, FaCamera } from "react-icons/fa";');
  } else if (account.includes('from "react-icons/fa";')) {
    account = account.replace(/import\s*\{([^}]+)\}\s*from "react-icons\/fa";/, (m, icons) => {
      return `import {${icons}, FaBellSlash } from "react-icons/fa";`;
    });
  } else {
    console.warn("Could not automatically add FaBellSlash import. Add it manually if build complains.");
  }
}

// Add dismissBusy state after uploadBusy if present.
if (!account.includes("dismissBusy")) {
  account = account.replace(
    'const [uploadBusy, setUploadBusy] = useState(false);',
    'const [uploadBusy, setUploadBusy] = useState(false);\n  const [dismissBusy, setDismissBusy] = useState(false);'
  );
}

// Add dismissAllNotifications function after markNotificationsRead.
if (!account.includes("const dismissAllNotifications = async")) {
  const marker = `  const markNotificationsRead = async () => {
    if (!token) return;
    try {
      await api.post("/notifications/mark-read", {}, token);
      await loadNotifications();
    } catch {
      // keep UI quiet; next poll will refresh
    }
  };`;

  const insert = `${marker}

  const dismissAllNotifications = async () => {
    if (!token || dismissBusy) return;

    setDismissBusy(true);
    try {
      await api.post("/notifications/dismiss-all", {}, token).catch(() => api.post("/notifications/mark-read", {}, token));
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
      await loadNotifications();
    } catch {
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
    } finally {
      setDismissBusy(false);
    }
  };`;

  if (account.includes(marker)) {
    account = account.replace(marker, insert);
  } else {
    console.warn("Could not find markNotificationsRead block. Adding dismiss function before first useEffect.");
    account = account.replace(
      "  useEffect(() => {",
      `  const dismissAllNotifications = async () => {
    if (!token || dismissBusy) return;

    setDismissBusy(true);
    try {
      await api.post("/notifications/dismiss-all", {}, token).catch(() => api.post("/notifications/mark-read", {}, token));
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
      await loadNotifications();
    } catch {
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
    } finally {
      setDismissBusy(false);
    }
  };

  useEffect(() => {`
    );
  }
}

// Add button before upload/change profile picture label.
if (!account.includes("Dismiss all notifications")) {
  const labelMarker = `<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#087f73] ring-1 ring-[#12372a]/10 hover:bg-[#eaf9f7]">`;
  const dismissButton = `<button
              type="button"
              onClick={dismissAllNotifications}
              disabled={dismissBusy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffebe5] px-3 py-2 text-xs font-black text-[#7a2b18] ring-1 ring-[#b94024]/15 transition hover:bg-[#ffd8cc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaBellSlash />
              {dismissBusy ? "Clearing notifications..." : "Dismiss all notifications"}
            </button>

            ${labelMarker}`;

  if (account.includes(labelMarker)) {
    account = account.replace(labelMarker, dismissButton);
  } else {
    console.warn("Could not find profile upload label. Add the dismiss button manually inside the dropdown.");
  }
}

write(accountFile, account);

// Patch notifications route with /dismiss-all endpoint.
const notificationsFile = path.join("server", "routes", "notifications.js");
let route = read(notificationsFile);

if (!route.includes('"/dismiss-all"')) {
  const deleteMarker = `router.delete(
  "/:id",`;

  const endpoint = `router.post(
  "/dismiss-all",
  auth,
  asyncHandler(async (req, res) => {
    const uid = String(req.user?._id || req.user?.id || "");
    const now = new Date();

    await Notification.updateMany(
      { userId: uid, dismissedAt: null },
      { $set: { readAt: now, dismissedAt: now } }
    );

    // Also clear conversation/message badge counts for this user.
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

${deleteMarker}`;

  if (route.includes(deleteMarker)) {
    route = route.replace(deleteMarker, endpoint);
  } else {
    console.warn("Could not find delete route marker. Appending endpoint before module.exports.");
    route = route.replace("module.exports = router;", `${endpoint.replace(deleteMarker, "")}\nmodule.exports = router;`);
  }
}

write(notificationsFile, route);

console.log("Dismiss all notification patch complete.");
