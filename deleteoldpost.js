const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ storageState: 'fb-session.json' });
  const page = await context.newPage();

  await page.goto('https://www.facebook.com/100004076987599/allactivity?activity_history=false&category_key=GROUPPOSTS', {
    waitUntil: 'domcontentloaded'
  });

  await page.waitForTimeout(5000);

  let deletedCount = 0;

  const blocks = await page.locator('div:has-text("a publié dans")').elementHandles();
  console.log(`🔍 ${blocks.length} blocs avec "a publié dans"`);

  for (const block of blocks) {
    try {
      const text = await block.innerText();

      if (
        text.includes('a commenté') ||
        text.includes('a répondu') ||
        text.includes('a partagé') ||
        text.includes('a aimé') ||
        text.includes('a ajouté') ||
        text.includes('Historique d’activité') ||
        text.includes('Publications et commentaires dans des groupes')
      ) {
        console.log('⛔ Bloc ignoré (autre type d’activité)');
        continue;
      }

      console.log(`🧾 Bloc valide : ${text.split('\n')[0]}`);

      const menuBtn = await block.$('div[aria-label="Options d’action"]');
      if (!menuBtn) {
        console.warn('❌ Bouton "…" introuvable dans ce bloc');
        continue;
      }

      await menuBtn.click();
      await page.waitForTimeout(500);

      const deleteBtn = page.locator('div[role="menu"] >> text=Supprimer').first();
      await deleteBtn.waitFor({ timeout: 4000 });
      await deleteBtn.click();
      console.log('🗑️ Clic sur "Supprimer"');

      const confirm = page.locator('div[role="dialog"] >> role=button[name="Supprimer"]');
      await confirm.waitFor({ timeout: 4000 });
      await confirm.click();
      console.log('✅ Supprimé avec succès');

      deletedCount++;
      await page.waitForTimeout(1500);
    } catch (err) {
      console.warn('⚠️ Erreur pendant le traitement d’un bloc :', err.message);
    }
  }

  console.log(`🎉 Fin : ${deletedCount} post(s) supprimé(s)`);
  await browser.close();
})();
