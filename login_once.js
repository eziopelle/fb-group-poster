require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Ouvre Chromium en mode visible
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🚀 Ouverture de Facebook login...");
  await page.goto('https://www.facebook.com/login');

  console.log("⌨️ Remplis tes identifiants...");
  await page.fill('#email', process.env.FB_EMAIL);
  await page.fill('#pass', process.env.FB_PASSWORD);
  await page.click('button[name="login"]');

  console.log("🕒 Tu as 30 secondes pour résoudre manuellement tout CAPTCHA ou 2FA...");
  await page.waitForTimeout(100000); // <-- Le temps de faire les vérifs

  console.log("💾 Sauvegarde de la session...");
  await context.storageState({ path: 'fb-session.json' });

  console.log("✅ Session Facebook enregistrée !");
  await browser.close();
})();
