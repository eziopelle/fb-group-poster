require('dotenv').config(); // 🥇 Charger .env en premier
const { GoogleSpreadsheet } = require('google-spreadsheet');
const credsPath = process.env.GOOGLE_CREDENTIALS_PATH;
const creds = require(credsPath);

const SPREADSHEET_ID = process.env.GSHEET_ID;


async function getGroupUrls() {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth(creds); // ✅ ça fonctionne avec v3.3.0
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  return rows.map((row) => row.group_url).filter(Boolean);
}

module.exports = { getGroupUrls };

