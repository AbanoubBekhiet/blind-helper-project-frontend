const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const SERVER_URL = "https://mervin-superdelicate-incapably.ngrok-free.dev/detect";

let mode = "none"; 
let isSpeaking = false;
let lastSpokenText = "";
let lastSpokenObjects = [];
let clickTimes = [];


// ---------------------- SPEAK ----------------------
function speak(text) {
    if (isSpeaking) return;

    isSpeaking = true;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";

    utter.onend = () => {
        isSpeaking = false;
    };

    speechSynthesis.speak(utter);
}


// ---------------------- CAMERA ----------------------
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = stream;
        video.play();
    } catch (err) {
        speak("الكاميرا الخلفية غير متاحة، تم استخدام الكاميرا الأمامية");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.play();
    }
}


// ---------------------- MODE SWITCH (2 clicks / 3 clicks) ----------------------
video.addEventListener("click", () => {
    const now = Date.now();
    clickTimes.push(now);

    clickTimes = clickTimes.filter(t => now - t < 600);

    if (clickTimes.length === 2) {
        mode = "detect";
        lastSpokenObjects = [];
        speak("تم تفعيل وضع اكتشاف الأشياء");
        clickTimes = [];
    }

    if (clickTimes.length === 3) {
        mode = "ocr";
        lastSpokenText = "";
        speak("تم تفعيل وضع قراءة النصوص");
        clickTimes = [];
    }
});


// ---------------------- SEND FRAME ----------------------
async function sendFrame() {
    if (mode === "none") return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg")
    );

    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
        const response = await fetch(`${SERVER_URL}?mode=${mode}`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (mode === "detect") {
            handleObjectDetection(result);
        }

        if (mode === "ocr") {
            handleOCR(result);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}


// ---------------------- OBJECT DETECTION ----------------------
function handleObjectDetection(result) {
    const objects = result.objects || [];

    const newOnes = objects.filter(o => !lastSpokenObjects.includes(o));

    if (newOnes.length > 0) {
        speak(newOnes.join(" ، "));
        lastSpokenObjects = [...objects];
    }
}


// ---------------------- OCR ----------------------
function handleOCR(result) {
    const text = (result.text || "").trim();

    if (text && text !== lastSpokenText) {
        lastSpokenText = text;
        speak(text);
    }
}


// ---------------------- AUTO RUN EVERY 5 SECONDS ----------------------
setInterval(() => {
    if (mode !== "none") sendFrame();
}, 5000);


// ---------------------- START ----------------------
startCamera().then(() => {
    setTimeout(() => {
        speak("لو عايز وضع اكتشاف الأشياء اضغط مرتين. لو عايز وضع قراءة النصوص اضغط ثلاث مرات.");
    }, 1500);
});
