const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const preview = document.getElementById('preview');
const cameraBtn = document.getElementById('camera');
const recordBtn = document.getElementById('record');
const stopBtn = document.getElementById('stop');
const statusEl = document.getElementById('status');
let stream = null;
let recorder = null;
let chunks = [];

function status(message) { statusEl.textContent = message; }

cameraBtn.addEventListener('click', async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('এই ব্রাউজারে ক্যামেরা ব্যবহার সমর্থিত নয়। HTTPS ও Telegram Mini App প্রয়োজন।');
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    preview.srcObject = stream;
    cameraBtn.disabled = true;
    recordBtn.disabled = false;
    status('ক্যামেরা চালু হয়েছে। রেকর্ডিং ও পাঠানোর জন্য আলাদা সম্মতি দিন।');
  } catch (error) { status(error.message || 'ক্যামেরা চালু করা যায়নি।'); }
});

recordBtn.addEventListener('click', () => {
  if (!stream) return status('আগে ক্যামেরা চালু করুন।');
  const accepted = window.confirm('আপনি কি ভিডিও রেকর্ড এবং JokeMasterBD অ্যাডমিনের কাছে পাঠাতে সম্মতি দিচ্ছেন?');
  if (!accepted) return status('রেকর্ডিং শুরু হয়নি। আপনার সম্মতি নেওয়া হয়নি।');
  chunks = [];
  const mimeType = ['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = () => status('রেকর্ডিংয়ে সমস্যা হয়েছে।');
    recorder.onstop = uploadVideo;
    recorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    status('রেকর্ডিং চলছে। শেষ হলে “রেকর্ডিং বন্ধ করুন” চাপুন।');
  } catch (error) { status(error.message || 'রেকর্ডার চালু করা যায়নি।'); }
});

stopBtn.addEventListener('click', () => {
  if (recorder?.state === 'recording') recorder.stop();
  stopBtn.disabled = true;
  stream?.getTracks().forEach(track => track.stop());
  preview.srcObject = null;
  cameraBtn.disabled = false;
  status('রেকর্ডিং শেষ। ভিডিও পাঠানো হচ্ছে…');
});

async function uploadVideo() {
  const blob = new Blob(chunks, { type: recorder?.mimeType || 'video/webm' });
  if (!blob.size) { status('কোনো ভিডিও তৈরি হয়নি।'); return; }
  const form = new FormData();
  form.append('video', blob, 'jokemasterbd-video.webm');
  form.append('recordingConsent', 'yes');
  try {
    const response = await fetch('/api/video', {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': tg?.initData || '' },
      body: form
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'ভিডিও পাঠানো যায়নি।');
    status(result.message || 'ভিডিও পাঠানো হয়েছে।');
  } catch (error) { status(error.message || 'ভিডিও পাঠাতে সমস্যা হয়েছে।'); }
  finally { chunks = []; recorder = null; recordBtn.disabled = true; }
}

window.addEventListener('pagehide', () => stream?.getTracks().forEach(track => track.stop()));