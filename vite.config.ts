import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Ensure Vite runs on the expected port
    proxy: {
      '/vtt_files': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploaded_videos': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/transcribe_video': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});