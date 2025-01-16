import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function deleteFolderContents(folderPath, exclude = []) {
  if (!fs.existsSync(folderPath)) return;
  fs.readdirSync(folderPath).forEach((file) => {
    const fullPath = path.join(folderPath, file);
    if (!exclude.includes(file)) {
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'post-build-move',
      closeBundle() {
        const docsPath = path.resolve(__dirname, '../docs');
        const distPath = path.resolve(__dirname, './dist');
        
        // Ensure the docs directory exists
        if (!fs.existsSync(docsPath)) {
          fs.mkdirSync(docsPath, { recursive: true });
        }

        // Clean the docs folder except vite-project
        deleteFolderContents(docsPath, ['vite-project']);

        // Move dist contents to docs
        if (fs.existsSync(distPath)) {
          fs.readdirSync(distPath).forEach((file) => {
            const sourcePath = path.join(distPath, file);
            const destPath = path.join(docsPath, file);
            fs.renameSync(sourcePath, destPath);
          });
        }

        console.log('Build output moved to ./docs successfully!');
      },
    },
  ],
  base: '/',
});
