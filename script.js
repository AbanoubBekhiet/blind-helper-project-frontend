const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const descriptionEl = document.getElementById("description");

const SERVER_URL = "https://mervin-superdelicate-incapably.ngrok-free.dev";

let arabicVoice = null;
let isSpeaking = false;

let currentMode = "none";  
let lastTextOCR = "";
let lastObjectText = "";

const DETECT_INTERVAL = 5000; // 5 sec
const OCR_INTERVAL = 2000; // 2 sec

let detectIntervalID = null;
let ocrIntervalID = null;

// Load Arabic voice
speechSynthesis.onvoiceschanged = () => {
    arabicVoice = speechSynthesis.getVoices().find(v =>
        v.lang.includes("ar") || v.name.toLowerCase().includes("arabic")
    );
};

// Speak function
function speak(text) {
    if (!text || isSpeaking) return;

    isSpeaking = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar";
    u.rate = 0.9;
    if (arabicVoice) u.voice = arabicVoice;
    u.onend = () => isSpeaking = false;
    speechSynthesis.speak(u);
}

// Startup message
window.onload = () => {
    speak("اضغط مرتين لتفعيل وضع اكتشاف الأجسام. اضغط ثلاث مرات لتفعيل وضع قراءة النصوص.");
};

// Camera Setup
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } }
        });
        video.srcObject = stream;
        video.play();
    } catch {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }
        });
        video.srcObject = stream;
        video.play();
    }
}

startCamera();

// =============================
// TAP HANDLING (Double / Triple)
// =============================
let tapCount = 0;
document.addEventListener("click", () => {
    tapCount++;
    setTimeout(() => {
        if (tapCount === 2) activateDetection();
        if (tapCount === 3) activateOCR();
        tapCount = 0;
    }, 300);
});

// =============================
// MODES
// =============================
function stopAll() {
    clearInterval(detectIntervalID);
    clearInterval(ocrIntervalID);
    currentMode = "none";
}

function activateDetection() {
    stopAll();
    currentMode = "detect";
    speak("تم تفعيل وضع اكتشاف الأجسام");

    detectIntervalID = setInterval(sendToDetect, DETECT_INTERVAL);
}

function activateOCR() {
    stopAll();
    currentMode = "ocr";
    speak("تم تفعيل وضع قراءة النصوص");

    ocrIntervalID = setInterval(sendToOCR, OCR_INTERVAL);
}

// =============================
// IMAGE CAPTURE
// =============================
function captureFrame() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg")
    );
}

// =============================
// OBJECT DETECTION
// =============================
async function sendToDetect() {
    const blob = await captureFrame();
    const form = new FormData();
    form.append("file", blob, "frame.jpg");

    try {
        const res = await fetch(SERVER_URL + "/detect", { method: "POST", body: form });
        const data = await res.json();

        if (data.text !== lastObjectText && data.text !== "لا توجد أشياء مكتشفة") {
            speak(data.text);
            lastObjectText = data.text;
        }

        descriptionEl.textContent = data.text;

    } catch (err) {
        console.log("Detection error:", err);
    }
}

// =============================
// LIVE OCR
// =============================
async function sendToOCR() {
    const blob = await captureFrame();
    const form = new FormData();
    form.append("file", blob, "frame.jpg");

    try {
        const res = await fetch(SERVER_URL + "/ocr", { method: "POST", body: form });
        const data = await res.json();

        const text = data.text.trim();

        if (text && text !== lastTextOCR) {
            speak(text);
            lastTextOCR = text;
        }

        descriptionEl.textContent = text || "لا يوجد نص";

    } catch (err) {
        console.log("OCR error:", err);
    }
}
