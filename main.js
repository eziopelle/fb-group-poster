const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// 🔐 Login
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

// 📤 Préparer le post
ipcMain.handle('prepare-post', async (_event, { message, imagePaths }) => {
  // 1. Écrire le message dans un fichier temporaire (message.txt)
  const msgPath = path.join(__dirname, 'message.txt');
  fs.writeFileSync(msgPath, message);

  // 2. Nettoyer dossier media/
  const mediaDir = path.join(__dirname, 'media');
  if (fs.existsSync(mediaDir)) {
    fs.readdirSync(mediaDir).forEach(file => {
      fs.unlinkSync(path.join(mediaDir, file));
    });
  } else {
    fs.mkdirSync(mediaDir);
  }

  imagePaths.forEach((srcPath, index) => {
    if (!srcPath || typeof srcPath !== 'string') return; // ✅ skip les mauvais fichiers
    const ext = path.extname(srcPath);
    const dest = path.join(mediaDir, `photo${index + 1}${ext}`);
    fs.copyFileSync(srcPath, dest);
  });
  
});

// ▶️ Lancer un script
ipcMain.handle('run-script', async (_event, scriptName) => {
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
