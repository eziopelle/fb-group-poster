const { getGroupUrls } = require('./google-sheet'); // 👈 récupère les liens
// ... le reste du code (imports, MESSAGE, IMAGES, etc.)
require('dotenv').config();
const { chromium } = require('playwright');
const path = require('path');
const required = ['FB_EMAIL', 'FB_PASSWORD', 'GROUP_URL', 'GSHEET_ID', 'GOOGLE_CREDENTIALS_PATH'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`⚠️ La variable ${key} est manquante dans le .env`);
  }
}


const fs = require('fs');
const messagePath = path.join(__dirname, 'message.txt');
const MESSAGE = fs.existsSync(messagePath) ? fs.readFileSync(messagePath, 'utf8') : '';


const mediaDir = path.join(__dirname, 'media');
const imageFiles = fs.readdirSync(mediaDir)
  .filter(file => file.match(/\.(jpg|jpeg|png)$/i))
  .sort(); // optionnel : garde l'ordre alphabétique

const IMAGES = imageFiles.map(file => path.join(mediaDir, file));


// Gère les cookies et popups
async function handleAllCookiePopups(page) {
  const labels = [
    'Autoriser tous les cookies',
    'Accepter tous les cookies',
    'Tout accepter',
    'Autoriser les cookies',
    'Allow all cookies',
    'Accept all cookies',
  ];

  for (const label of labels) {
    try {
      const button = page.locator(`button:has-text("${label}")`);
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
        console.log(`🍪 Bouton cookies cliqué : ${label}`);
        await page.waitForTimeout(1000);
      }
    } catch (_) {}
  }

  const selectors = [
    '[data-testid="cookie-policy-manage-dialog"]',
    '[aria-label="Cookies essentiels"]',
    '[role="dialog"]',
    '[id^="cookie"]',
  ];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 2000 })) {
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.remove();
        }, selector);
        console.log(`🧹 Popup supprimé : ${selector}`);
        await page.waitForTimeout(700);
      }
    } catch (_) {}
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'fb-session.json' });
  const page = await context.newPage();

  const urls = await getGroupUrls();

  for (const GROUP_URL of urls) {
    try {
      console.log(`\n🚀 Accès au groupe : ${GROUP_URL}`);
      await page.goto(GROUP_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      await handleAllCookiePopups(page);
      await page.waitForTimeout(4000);
      await handleAllCookiePopups(page);
      await page.screenshot({ path: `screens/group_load_${Date.now()}.png`, fullPage: true });


      // Ouverture éditeur
      const openEditorButton = page.locator('div[role="button"] span:has-text("Exprimez-vous...")');
      await openEditorButton.first().click({ timeout: 5000 });
      await page.waitForTimeout(4000);
      console.log("🖊 Éditeur ouvert.");

      // Champ texte avec fallback
// Champ texte avec fallback + gestion des deux variantes
// Champ texte avec fallback + gestion des deux variantes
const modal = page.locator('div[role="dialog"]').first();
await modal.waitFor({ timeout: 5000 });

let editableDiv = null;

const exprimezVous = modal.locator('[contenteditable="true"][aria-label="Exprimez-vous"]').first();
const creerPublication = modal.locator('[contenteditable="true"][aria-label="Créer une publication publique..."]').first();

if (await exprimezVous.isVisible()) {
  editableDiv = exprimezVous;
  console.log("📝 Champ 'Exprimez-vous' détecté");
} else if (await creerPublication.isVisible()) {
  editableDiv = creerPublication;
  console.log("📝 Champ 'Créer une publication publique...' détecté");
}

if (editableDiv) {
  try {
    await editableDiv.click({ force: true });
    await editableDiv.evaluate(el => el.focus());
    await page.waitForTimeout(500);
    await page.keyboard.type(MESSAGE, { delay: 15 });
  } catch (err) {
    console.warn("⚠️ Erreur pendant l'écriture, passage au fallback.");
  }
} else {
  console.warn("⚠️ Aucun champ détecté, fallback sur premier contenteditable dans la modale...");
  const fallback = modal.locator('[contenteditable="true"]').first();
  await fallback.click({ force: true });
  await fallback.evaluate(el => el.focus());
  await page.waitForTimeout(500);
  await page.keyboard.type(MESSAGE, { delay: 20 });
}



      // Ajout images
      const imageButton = page.locator('[aria-label="Photo/Vidéo"]');
      await imageButton.first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      const fileInput = page.locator('input[type="file"][accept^="image"]');
      await fileInput.setInputFiles(IMAGES);
      await page.waitForTimeout(3000);

      // Publier
      const publishButton = page.locator('div[aria-label="Publier"]');
      await publishButton.waitFor({ timeout: 4000 });
      const isDisabled = await publishButton.getAttribute('aria-disabled');
      if (isDisabled !== 'true') {
        await publishButton.click();
        console.log("✅ Post publié !");
      } else {
        console.warn("⚠️ Bouton Publier désactivé.");
      }

      await page.waitForTimeout(4000);
    } catch (err) {
      console.error(`💥 Erreur pour le groupe ${GROUP_URL} :`, err);
      await page.screenshot(`{ path: error_${Date.now()}.png, fullPage: true }`);
    }
  }

  await browser.close();
})();