// deleteoldpost.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'auth.json' // Assure-toi d’avoir un état d’authentification valide
  });
  const page = await context.newPage();

  console.log('Chargement de la page...');
  await page.goto('https://www.facebook.com/100004076987599/allactivity?activity_history=false&category_key=GROUPPOSTS&manage_mode=false&should_load_landing_page=false', {
    waitUntil: 'domcontentloaded'
  });

  await page.waitForTimeout(5000); // Laisse Facebook tout charger

  // Fonction pour scroller vers le bas pour charger plus d’éléments
  const scrollToBottom = async () => {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(2000);
  };

  // Fonction principale de suppression
  const deleteGroupPosts = async () => {
    let deleted = 0;
    let tries = 0;

    while (tries < 30) { // Limite à 30 scrolls
      const posts = await page.$$('div[role="article"]');

      for (const post of posts) {
        const textContent = await post.innerText();

        if (textContent.includes('a publié dans') && !textContent.includes('a commenté')) {
          try {
            const menuButton = await post.$('div[aria-label="Actions pour cette activité"]');
            if (menuButton) await menuButton.click();

            await page.waitForTimeout(500);

            const deleteButton = await page.locator('text=Supprimer').first();
            if (await deleteButton.isVisible()) {
              await deleteButton.click();
              deleted++;
              console.log(`✅ Publication supprimée (${deleted})`);
              await page.waitForTimeout(2000);
            }
          } catch (err) {
            console.warn('⚠️ Erreur lors de la suppression :', err);
          }
        }
      }

      await scrollToBottom();
      tries++;
    }

    console.log(`🎉 ${deleted} publications supprimées.`);
    await browser.close();
  };

  await deleteGroupPosts();
})();
