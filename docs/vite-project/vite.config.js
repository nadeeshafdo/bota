import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function deleteFolderContents(folderPath, exclude = []) {
  if (!fs.existsSync(folderPath)) return;
  
  const items = fs.readdirSync(folderPath);
  for (const item of items) {
    if (exclude.includes(item)) continue;
    
    const fullPath = path.join(folderPath, item);
    if (fs.lstatSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

function moveDirectory(source, destination) {
  if (!fs.existsSync(source)) return;

  const items = fs.readdirSync(source);
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);

    try {
      // Handle existing files/directories at destination
      if (fs.existsSync(destPath)) {
        if (fs.lstatSync(destPath).isDirectory()) {
          fs.rmSync(destPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(destPath);
        }
      }
      
      // Move the file/directory
      fs.renameSync(sourcePath, destPath);
    } catch (error) {
      console.error(`Error moving ${item}: ${error.message}`);
      // If rename fails (e.g., across devices), fallback to copy
      if (fs.lstatSync(sourcePath).isDirectory()) {
        fs.cpSync(sourcePath, destPath, { recursive: true });
        fs.rmSync(sourcePath, { recursive: true, force: true });
      } else {
        fs.copyFileSync(sourcePath, destPath);
        fs.unlinkSync(sourcePath);
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'post-build-move',
      closeBundle() {
        try {
          // Fix: Go up two levels to reach the root docs directory
          const docsPath = path.resolve(__dirname, '..', '..', 'docs');
          const distPath = path.resolve(__dirname, 'dist');

          console.log('Docs path:', docsPath); // Debug log
          console.log('Dist path:', distPath); // Debug log

          // Clean docs directory except vite-project
          deleteFolderContents(docsPath, ['vite-project']);

          // Move dist contents to docs
          moveDirectory(distPath, docsPath);

          // Clean up dist directory
          if (fs.existsSync(distPath)) {
            fs.rmSync(distPath, { recursive: true, force: true });
          }

          console.log('✨ Build output successfully moved to ./docs!');
        } catch (error) {
          console.error('Error in post-build process:', error);
          throw error;
        }
      }
    }
  ],
  base: '/bota/',
});