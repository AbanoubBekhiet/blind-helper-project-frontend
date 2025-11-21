const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const SERVER_URL = "https://blind-helper-project-backend.fly.dev/detect";
const descriptionEl = document.getElementById("description");

let isSpeaking = false;
let arabicVoice = null;

// Load Arabic voice
speechSynthesis.onvoiceschanged = () => {
    const voices = speechSynthesis.getVoices();
    arabicVoice = voices.find(v =>
        v.lang.includes("ar") || v.name.toLowerCase().includes("arabic")
    );
    console.log("Arabic voice loaded:", arabicVoice);
};

video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
});

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();
    setInterval(captureFrame, 3000); // every 3 seconds
}

async function captureFrame() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
        const res = await fetch(SERVER_URL, { method: "POST", body: formData });
        const data = await res.json();

        if (data.objects?.length > 0) {
            descriptionEl.textContent = data.text;

            data.objects.forEach(o => {
                const [x1, y1, x2, y2] = o.bbox;

                ctx.strokeStyle = "#00ff99";
                ctx.lineWidth = 3;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

                ctx.fillStyle = "#00ff99";
                ctx.font = "18px Arial";
                ctx.fillText(`${o.label} - ${o.distance_label}`, x1, y1 - 5);
            });

            if (!isSpeaking && data.text) speakArabic(data.text);
        } else {
            descriptionEl.textContent = "لا توجد أشياء مكتشفة";
        }
    } catch (err) {
        console.error("خطأ:", err);
    }
}

function speakArabic(text) {
    isSpeaking = true;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar";
    utter.rate = 0.9;
    if (arabicVoice) utter.voice = arabicVoice;
    utter.onend = () => { isSpeaking = false; };
    speechSynthesis.speak(utter);
}

startCamera();
