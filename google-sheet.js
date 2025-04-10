require('dotenv').config(); // 🥇 Charger .env en premier
const { GoogleSpreadsheet } = require('google-spreadsheet');
const credsPath = process.env.GOOGLE_CREDENTIALS_PATH;
const creds = require(credsPath);

const SPREADSHEET_ID = process.env.GSHEET_ID;

async function getGroupRows() {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  return rows.filter(row => row.group_url); // on garde que ceux avec une URL
}

module.exports = { getGroupRows };
