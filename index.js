require('dotenv').config();
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { getGroupRows } = require('./google-sheet');

const required = ['FB_EMAIL', 'FB_PASSWORD', 'GSHEET_ID', 'GOOGLE_CREDENTIALS_PATH'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`⚠️ La variable ${key} est manquante dans le .env`);
  }
}

const messagePath = path.join(__dirname, 'message.txt');
const MESSAGE = fs.existsSync(messagePath) ? fs.readFileSync(messagePath, 'utf8') : '';

const mediaDir = path.join(__dirname, 'media');
const imageFiles = fs.readdirSync(mediaDir)
  .filter(file => file.match(/\.(jpg|jpeg|png)$/i))
  .sort();

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

  const rows = await getGroupRows();

  // Exclure les groupes avec status "done ✅" ou "failed ❌"
  const filteredRows = rows.filter(row => {
    const status = (row.status || '').toLowerCase().trim();
    return status !== 'done ✅' && status !== 'failed ❌';
  });

  for (const row of filteredRows) {
    const GROUP_URL = row.group_url;

    try {
      console.log(`\n🚀 Accès au groupe : ${GROUP_URL}`);
      await page.goto(GROUP_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      await handleAllCookiePopups(page);
      await page.waitForTimeout(4000);
      await handleAllCookiePopups(page);
      await page.screenshot({ path: `screens/group_load_${Date.now()}.png`, fullPage: true });

      const openEditorButton = page.locator('div[role="button"] span:has-text("Exprimez-vous...")');
      await openEditorButton.first().click({ timeout: 5000 });
      await page.waitForTimeout(4000);
      console.log("🖊 Éditeur ouvert.");

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

      const imageButton = page.locator('[aria-label="Photo/Vidéo"]');
      await imageButton.first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      const fileInput = page.locator('input[type="file"][accept^="image"]');
      await fileInput.setInputFiles(IMAGES);
      await page.waitForTimeout(3000);

      const publishButton = page.locator('div[aria-label="Publier"]');
      await publishButton.waitFor({ timeout: 4000 });
      const isDisabled = await publishButton.getAttribute('aria-disabled');
      if (isDisabled !== 'true') {
        await publishButton.click();
        console.log("✅ Post publié !");
        row.status = 'done ✅';
        await row.save();
        console.log(`✏️ Sheet mis à jour pour ${GROUP_URL}`);
      } else {
        console.warn("⚠️ Bouton Publier désactivé.");
        row.status = 'failed ❌';
        await row.save();
        console.log(`✏️ Sheet mis à jour avec "failed ❌" pour ${GROUP_URL}`);
      }

      await page.waitForTimeout(4000);
    } catch (err) {
      console.error(`💥 Erreur pour le groupe ${GROUP_URL} :`, err);
      await page.screenshot({ path: `screens/error_${Date.now()}.png`, fullPage: true });
      row.status = 'failed ❌';
      await row.save();
      console.log(`✏️ Sheet mis à jour avec "failed ❌" pour ${GROUP_URL}`);
    }
  }

  await browser.close();
})();
