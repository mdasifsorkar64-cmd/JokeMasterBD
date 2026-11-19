const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const preview = document.getElementById('preview');
const cameraBtn = document.getElementById('camera');
const recordBtn = document.getElementById('record');
const stopBtn = document.getElementById('stop');
const cameraOffBtn = document.getElementById('cameraOff');
const statusEl = document.getElementById('status');

let stream = null;
let recorder = null;
let chunks = [];
let recordingMime = 'video/webm';

function status(message) {
  statusEl.textContent = message;
}

function stopCamera() {
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  preview.srcObject = null;
  cameraBtn.disabled = false;
  cameraOffBtn.disabled = true;
  recordBtn.disabled = true;
}

cameraBtn.addEventListener('click', async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('ক্যামেরার জন্য HTTPS-সহ Telegram Mini App খুলুন।');
    }
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    preview.srcObject = stream;
    cameraBtn.disabled = true;
    cameraOffBtn.disabled = false;
    recordBtn.disabled = false;
    status('ক্যামেরা চালু। এখন রেকর্ডিং ও পাঠানোর জন্য আলাদা সম্মতি দিন।');
  } catch (error) {
    status(error.message || 'ক্যামেরা চালু করা যায়নি।');
  }
});

cameraOffBtn.addEventListener('click', () => {
  if (recorder?.state === 'recording') recorder.stop();
  stopCamera();
  status('ক্যামেরা বন্ধ করা হয়েছে।');
});

recordBtn.addEventListener('click', () => {
  if (!stream) return status('আগে ক্যামেরা চালু করুন।');

  const accepted = window.confirm(
    'আপনি কি এখন ভিডিও রেকর্ড করতে এবং রেকর্ড শেষ হলে JokeMasterBD অ্যাডমিনের Telegram-এ পাঠাতে সম্মতি দিচ্ছেন?'
  );
  if (!accepted) return status('আপনার সম্মতি না থাকায় রেকর্ডিং শুরু হয়নি।');

  chunks = [];
  const supportedType = [
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ].find(type => window.MediaRecorder?.isTypeSupported(type));

  try {
    recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
    recordingMime = recorder.mimeType || 'video/webm';
    recorder.ondataavailable = event => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => status('রেকর্ডিংয়ে সমস্যা হয়েছে।');
    recorder.onstop = uploadVideo;
    recorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    cameraOffBtn.disabled = true;
    status('রেকর্ডিং চলছে। শেষ করতে “রেকর্ডিং বন্ধ করুন” চাপুন।');
  } catch (error) {
    status(error.message || 'রেকর্ডার চালু করা যায়নি।');
  }
});

stopBtn.addEventListener('click', () => {
  if (recorder?.state === 'recording') recorder.stop();
  stopBtn.disabled = true;
  stopCamera();
  status('রেকর্ডিং শেষ। সম্মত ভিডিওটি Telegram-এ পাঠানো হচ্ছে…');
});

async function uploadVideo() {
  const blob = new Blob(chunks, { type: recordingMime });
  if (!blob.size) {
    status('কোনো ভিডিও তৈরি হয়নি।');
    return;
  }

  const form = new FormData();
  const extension = recordingMime.includes('mp4') ? 'mp4' : 'webm';
  form.append('video', blob, `jokemasterbd-video.${extension}`);
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
  } catch (error) {
    status(error.message || 'ভিডিও পাঠাতে সমস্যা হয়েছে।');
  } finally {
    chunks = [];
    recorder = null;
    cameraBtn.disabled = false;
    cameraOffBtn.disabled = true;
    recordBtn.disabled = true;
    stopBtn.disabled = true;
  }
}

window.addEventListener('pagehide', stopCamera);
