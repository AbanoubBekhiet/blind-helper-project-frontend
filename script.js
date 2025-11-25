const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const SERVER_URL = "https://mervin-superdelicate-incapably.ngrok-free.dev/detect";
const descriptionEl = document.getElementById("description");
const toggleBtn = document.getElementById("toggleModeBtn");

let mode = "detect"; // "detect" أو "ocr"
let isSpeaking = false;
let arabicVoice = null;
const FRAME_INTERVAL = 5000; // كل 5 ثواني

// Load Arabic voice
speechSynthesis.onvoiceschanged = () => {
    const voices = speechSynthesis.getVoices();
    arabicVoice = voices.find(v => v.lang.includes("ar") || v.name.toLowerCase().includes("arabic"));
    console.log("Arabic voice loaded:", arabicVoice);
};

// تغيير الوضع عند الضغط على الزر
toggleBtn.addEventListener("click", () => {
    mode = mode === "detect" ? "ocr" : "detect";
    toggleBtn.textContent = mode === "detect" ? "الوضع: اكتشاف الأشياء" : "الوضع: قراءة النصوص";
    descriptionEl.textContent = mode === "detect" ? "الأشياء المكتشفة ستظهر هنا..." : "النصوص المكتشفة ستظهر هنا...";
});

// ضبط حجم الكانفس
video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
});

// تشغيل الكاميرا
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } });
        video.srcObject = stream;
        video.play();
    } catch (err) {
        console.warn("Back camera not available, using front camera.", err);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;
        video.play();
    }

    setInterval(captureFrame, FRAME_INTERVAL);
}

// التقاط الإطار وارساله للـ server
async function captureFrame() {
    if (video.readyState < 2) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");
    formData.append("mode", mode);

    try {
        const res = await fetch(SERVER_URL, { method: "POST", body: formData });
        const data = await res.json();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (data.mode === "detect" && data.objects?.length > 0) {
            descriptionEl.textContent = `${data.text}\n\n${data.yolo_benefits}`;

            data.objects.forEach(o => {
                const [x1, y1, x2, y2] = o.bbox;
                ctx.strokeStyle = "#00ff99";
                ctx.lineWidth = 3;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                ctx.fillStyle = "#00ff99";
                ctx.font = "18px Arial";
                ctx.fillText(`${o.label}`, x1, y1 - 5);
            });

            if (!isSpeaking && data.text) speakArabic(data.text);
        } else if (data.mode === "ocr") {
            descriptionEl.textContent = data.text;
            if (!isSpeaking && data.text) speakArabic(data.text);
        } else {
            descriptionEl.textContent = "لا توجد أشياء أو نصوص مكتشفة";
        }
    } catch (err) {
        console.error("خطأ في الاتصال بالخادم:", err);
    }
}

// النطق بالعربية
function speakArabic(text) {
    isSpeaking = true;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar";
    utter.rate = 0.9;
    if (arabicVoice) utter.voice = arabicVoice;
    utter.onend = () => { isSpeaking = false; };
    speechSynthesis.speak(utter);
}

// بدء الكاميرا
startCamera();
