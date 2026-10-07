import { fileURLToPath } from 'node:url';

// Resolve the Tailwind config relative to this file, not the process cwd —
// otherwise starting Vite from a parent dir silently falls back to stock Tailwind
// (no brand/sand palette) and every @apply of a custom color fails.
const config = fileURLToPath(new URL('./tailwind.config.js', import.meta.url));

export default {
  plugins: {
    tailwindcss: { config },
    autoprefixer: {},
  },
};
