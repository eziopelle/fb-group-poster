const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let win;

// 📌 Gestionnaire pour mettre à jour les credentials dans .env
ipcMain.handle('update-env', async (_event, { email, password }) => {
  const envPath = path.join(__dirname, '.env');
  let env = {};

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (let line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...rest] = line.split('=');
        env[key.trim()] = rest.join('=').trim();
      }
    }
  }

  env['FB_EMAIL'] = email;
  env['FB_PASSWORD'] = password;

  const newEnv = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, newEnv);
});

// 📤 Préparer le post avec chemin d’images (ancienne méthode)
ipcMain.handle('prepare-post', async (_event, { message, imagePaths }) => {
  console.log('🖼️ Images reçues (chemins) :', imagePaths);

  const msgPath = path.join(__dirname, 'message.txt');
  fs.writeFileSync(msgPath, message);

  const mediaDir = path.join(__dirname, 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir);
  else fs.readdirSync(mediaDir).forEach(file => fs.unlinkSync(path.join(mediaDir, file)));

  imagePaths.forEach((srcPath, index) => {
    if (!srcPath || typeof srcPath !== 'string') return;
    const ext = path.extname(srcPath);
    const dest = path.join(mediaDir, `photo${index + 1}${ext}`);
    fs.copyFileSync(srcPath, dest);
  });

  return true;
});

// 📤 Préparer le post avec buffers (méthode actuelle)
ipcMain.handle('prepare-post-buffers', async (_event, { message, buffers }) => {
  console.log('📦 Images reçues (buffers) :', buffers.map(b => b.name));

  const msgPath = path.join(__dirname, 'message.txt');
  fs.writeFileSync(msgPath, message);

  const mediaDir = path.join(__dirname, 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir);
  else fs.readdirSync(mediaDir).forEach(file => fs.unlinkSync(path.join(mediaDir, file)));

  buffers.forEach(({ name, buffer }, index) => {
    const ext = path.extname(name);
    const dest = path.join(mediaDir, `photo${index + 1}${ext}`);
    fs.writeFileSync(dest, Buffer.from(buffer));
  });

  return true;
});

// ▶️ Lancer un script externe
ipcMain.handle('run-script', async (_event, scriptName) => {
  console.log(`▶️ Lancement du script : ${scriptName}`);

  const process = spawn('node', [scriptName]);

  process.stdout.on('data', (data) => {
    win.webContents.send('log', data.toString());
  });

  process.stderr.on('data', (data) => {
    win.webContents.send('log', `⚠️ ${data.toString()}`);
  });

  process.on('close', (code) => {
    win.webContents.send('log', `✅ Script terminé avec code ${code}\n`);
  });
});

// 🪟 Création de la fenêtre principale
function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

// 🟢 Lancement de l’app
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
