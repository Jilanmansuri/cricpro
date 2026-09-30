// Configuration: Update this with your actual APK direct download link or GitHub Release URL
const CONFIG = {
  APP_NAME: "CricStats Pro",
  VERSION: "v1.0.0",
  // You can paste your direct EAS APK link or GitHub Release download link here:
  DOWNLOAD_URL: "https://github.com/Jilanmansuri/cricpro/releases/latest",
  GITHUB_REPO: "https://github.com/Jilanmansuri/cricpro",
  APK_FILE_NAME: "CricStats-Pro-v1.0.0.apk"
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup Download Button Links
  const mainDownloadBtn = document.getElementById('mainDownloadBtn');
  const navDownloadBtn = document.getElementById('navDownloadBtn');
  const qrBtn = document.getElementById('qrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeModal = document.getElementById('closeModal');
  const qrImage = document.getElementById('qrImage');

  if (mainDownloadBtn) {
    mainDownloadBtn.href = CONFIG.DOWNLOAD_URL;
  }
  if (navDownloadBtn) {
    navDownloadBtn.href = CONFIG.DOWNLOAD_URL;
  }

  // 2. Dynamic QR Code for Mobile Scanning
  if (qrImage) {
    const encodedUrl = encodeURIComponent(window.location.href);
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}&color=070B12&bgcolor=FFFFFF`;
  }

  // 3. QR Modal Toggle
  if (qrBtn && qrModal) {
    qrBtn.addEventListener('click', (e) => {
      e.preventDefault();
      qrModal.style.display = 'flex';
    });
  }

  if (closeModal && qrModal) {
    closeModal.addEventListener('click', () => {
      qrModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.style.display = 'none';
      }
    });
  }

  // 4. FAQ Accordion Interaction
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // 5. Download Click Tracker / Visual Feedback
  if (mainDownloadBtn) {
    mainDownloadBtn.addEventListener('click', () => {
      console.log(`[CricStats Pro] Download initiated: ${CONFIG.DOWNLOAD_URL}`);
    });
  }
});
