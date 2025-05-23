const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { fileURLToPath } = require('url');
const { execFile } = require('child_process');
const { clipboard, nativeImage} = require('electron');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');


ipcMain.handle('select-last-100-images', async () => {
  const folder = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (folder.canceled || !folder.filePaths.length) return [];

  const dirPath = folder.filePaths[0];
  const files = fs.readdirSync(dirPath)
    .filter(f => /\.(png|jpe?g|gif)$/i.test(f))
    .map(f => path.join(dirPath, f))
    .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime); // 최신순

  return files.slice(0, 100);
});

// 이미지에서 메타데이터 제거 후 클립보드에 복사

ipcMain.handle('sharp-copy-Image', async (event, filePath) => {
  try {
    // sharp을 사용하여 이미지에서 메타데이터 제거
    const buffer = await sharp(filePath)
    .toBuffer();

    // nativeImage로 변환
    const image = nativeImage.createFromBuffer(buffer);

    // 클립보드에 이미지 복사
    clipboard.writeImage(image);
  } catch (error) {
  }

});

const exePath = path.join(__dirname, 'dist', 'read_metadata.exe')

// Python 실행 함수
function parsePngMetadataViaPython(imagePath) {
  return new Promise((resolve, reject) => {

    execFile(exePath, [imagePath], (error, stdout, stderr)=> {
      if (error) {
        console.error('Python 실행 에러:', error);
        reject(error);
        return;
      }
      try {
        const result = stdout;
        resolve(result);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        reject(parseError);
      }
    });
  });
}

// 기존 핸들러를 Python 연동 버전으로 교체
ipcMain.handle('parse-png-metadata', async (event, filePath) => {
  try {
    let cleanPath = filePath;

    if (filePath.startsWith('file://')) {
      cleanPath = fileURLToPath(filePath);
    }

    return await parsePngMetadataViaPython(cleanPath);
  } catch (error) {
    console.error('메타데이터 파싱 실패:', error);
    throw error;
  }
});

ipcMain.handle('open-explorer', (event, filePath) => {
    shell.showItemInFolder(filePath);
  });

ipcMain.on('copy-image', (event, filePath) => {
    try {
      // file:/// 경로일 경우 안전하게 파일 경로 추출
      let cleanPath = filePath;
  
      if (filePath.startsWith('file://')) {
        cleanPath = fileURLToPath(filePath);
      }
      const image = nativeImage.createFromPath(cleanPath);
  
      if (image.isEmpty()) {
        return;
      }
  
      clipboard.writeImage(image);

    } catch (e) {

    }
  });

  ipcMain.handle('move-image', async (event, currentPath, targetFolder) => {
    try {
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }
      const fileName = path.basename(currentPath);
      const targetPath = path.join(targetFolder, fileName);
  
      await fs.promises.rename(currentPath, targetPath); // 이동
      return { success: true, newPath: targetPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('select-target-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });


  ipcMain.handle('delete-image', async (event, filePath) => {
    try {
      console.log("휴지통으로 보낼 파일 경로:", filePath);
      fs.unlinkSync(filePath); // 파일 삭제
      console.log("휴지통으로 이동 성공");
      return { success: true };
    } catch (err) {
      console.error("휴지통 이동 실패:", err);
      return { success: false, error: err.message };
    }
  });
  let mainWindow;

  function createWindow () {
    mainWindow = new BrowserWindow({
      width: 1600,
      height: 1200,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
      }
    });
  
    mainWindow.loadFile('renderer/index.html');
  
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled) return [];

  const folderPath = result.filePaths[0];
  const files = fs.readdirSync(folderPath);

  // 이미지 파일만 필터링
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
  });

  // 절대 경로로 변환
  const fullPaths = imageFiles.map(file => path.join(folderPath, file));
  return fullPaths;
});

app.on('window-all-closed', () => {
    // macOS가 아니라면 앱 종료
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  app.on('will-quit', () => {
    console.log('정리 중...');
    // 필요하다면 ipcMain 핸들러 제거 등도 수행
    ipcMain.removeHandler('sharp-copy-Image');
    ipcMain.removeHandler('parse-png-metadata');
    // 기타 정리할 리소스가 있다면 이곳에
  });
  app.on('activate', () => {
    // macOS에서 dock 아이콘 눌렀을 때 창이 없으면 새로 생성
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
app.whenReady().then(createWindow);
