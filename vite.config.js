import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';

// ================================================================
// vite.config.js — Shreerang Trendz
// Platform: Vercel + GitHub + Supabase + Bunny.net + Google Drive
// Removed all Hostinger Horizon-specific code
// ================================================================

const logger = createLogger();
const loggerError = logger.error;
logger.error = (msg, options) => {
	  if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		      return;
	  }
	  loggerError(msg, options);
};

export default defineConfig({
	  customLogger: logger,
	  plugins: [
		      react(),
		    ],
	  server: {
		      cors: true,
		      allowedHosts: true,
	  },
	  resolve: {
		      extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
		      alias: {
				        '@': path.resolve(__dirname, './src'),
			  },
	  },
	  build: {
		      rollupOptions: {
				        external: [
							        '@babel/parser',
							        '@babel/traverse',
							        '@babel/generator',
							        '@babel/types'
							      ]
			  }
	  }
});
