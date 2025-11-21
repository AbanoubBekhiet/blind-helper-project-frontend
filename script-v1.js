const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const SERVER_URL = "http://127.0.0.1:8000/detect";
const descriptionEl = document.getElementById("description");

let isPlayingAudio = false;

video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
});

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.play();
        setInterval(captureFrame, 10000); // كل 10 ثواني
    } catch (err) {
        console.error("خطأ في الوصول للكاميرا:", err);
    }
}

async function captureFrame() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
        const res = await fetch(SERVER_URL, { method: "POST", body: formData });
        const data = await res.json();

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (data.objects && data.objects.length > 0) {
            descriptionEl.textContent = data.objects
                .map(o => `${o.label}  ${o.distance_label}`)
                .join(", ");

            // رسم المستطيلات
            data.objects.forEach(o => {
                const [x1, y1, x2, y2] = o.bbox;
                ctx.strokeStyle = "#00ff99";
                ctx.lineWidth = 3;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

                ctx.fillStyle = "#00ff99";
                ctx.font = "18px Arial";
                ctx.fillText(
                    `${o.label} - ${o.distance_label}`,
                    x1,
                    y1 > 20 ? y1 - 5 : y1 + 20
                );
            });

            // تشغيل الصوت مرة واحدة لكل إطار
            if (!isPlayingAudio && data.audio_url) {
                isPlayingAudio = true;
                const audio = new Audio(`http://127.0.0.1:8000${data.audio_url}`);
                audio.play();
                audio.onended = () => { isPlayingAudio = false; };
            }
        } else {
            descriptionEl.textContent = data.message || "لا توجد أشياء مكتشفة";
        }
    } catch (err) {
        console.error("خطأ في الاتصال بالسيرفر:", err);
    }
}

startCamera();
