# 🌐 CricStats Pro - Web Landing & APK Download Page

A stunning, modern, responsive landing page for distributing the **CricStats Pro Android APK** directly to users for free.

---

## 🚀 How to Deploy in 2 Minutes (100% Free on Vercel)

### Method 1: Deploy with Vercel CLI
Open your terminal inside this folder:
```bash
cd "d:\CG VS code folder\cricpro\publish-web"
npx vercel
```
- When asked `Set up and deploy?`, press `y`.
- It will give you a live free URL like `https://cricstats-pro.vercel.app` in under 30 seconds!

### Method 2: Deploy with Netlify Drop (No code / Drag and Drop)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop this whole `publish-web` folder onto the web page.
3. Your website is instantly live!

---

## 🔗 How to Update the APK Download Link
When your EAS build finishes or you upload your APK to GitHub Releases:
1. Open `script.js`.
2. Update the `DOWNLOAD_URL` at the top:
```javascript
const CONFIG = {
  APP_NAME: "CricStats Pro",
  VERSION: "v1.0.0",
  DOWNLOAD_URL: "https://your-direct-apk-download-link-here.apk",
  GITHUB_REPO: "https://github.com/Jilanmansuri/cricpro"
};
```
That's it! All download buttons and QR codes will automatically point to your APK.
