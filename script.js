const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const SERVER_URL = "https://your-backend-url/detect"; 
let mode = "none"; // detect | ocr
let isSpeaking = false;
let lastSpokenText = "";
let lastSpokenObjects = [];
let clickTimes = [];

function speak(text) {
    if (isSpeaking) return;
    isSpeaking = true;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";
    utter.onend = () => (isSpeaking = false);

    speechSynthesis.speak(utter);
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = stream;
        video.play();
    } catch (err) {
        console.error(err);
        speak("الكاميرا الخلفية غير متاحة، تم استخدام الكاميرا الأمامية");
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        video.srcObject = stream;
        video.play();
    }
}

video.addEventListener("click", () => {
    const now = Date.now();
    clickTimes.push(now);

    clickTimes = clickTimes.filter(t => now - t < 600);

    if (clickTimes.length === 2) {
        mode = "detect";
        speak("تم تفعيل وضع اكتشاف الأشياء");
        clickTimes = [];
    }

    if (clickTimes.length === 3) {
        mode = "ocr";
        speak("تم تفعيل وضع قراءة النصوص");
        clickTimes = [];
    }
});

async function sendFrame() {
    if (!mode) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));

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
        } else if (mode === "ocr") {
            handleOCR(result);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

function handleObjectDetection(result) {
    const objects = result.objects || [];
    const newObjects = objects.filter(obj => !lastSpokenObjects.includes(obj));

    if (newObjects.length > 0) {
        speak(newObjects.join(" ، "));
        lastSpokenObjects = [...objects];
    }
}

function handleOCR(result) {
    const text = result.text || "";
    if (text && text !== lastSpokenText) {
        lastSpokenText = text;
        speak(text);
    }
}

// Auto run every 5 seconds
setInterval(() => {
    if (mode !== "none") {
        sendFrame();
    }
}, 5000);

// Start camera and play welcome message
startCamera().then(() => {
    setTimeout(() => {
        speak("لو عايز وضع اكتشاف الأشياء اضغط مرتين، لو عايز وضع قراءة النصوص اضغط ثلاث مرات");
    }, 1500);
});
