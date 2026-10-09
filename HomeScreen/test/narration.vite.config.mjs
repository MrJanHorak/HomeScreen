import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default {
  root,
  esbuild: {jsx: 'automatic'},
  optimizeDeps: {entries: ['narration.html'], rolldownOptions: {moduleTypes: {'.js': 'jsx'}, resolve: {extensions: ['.web.ts', '.web.tsx', '.web.js', '.js', '.mjs', '.ts', '.tsx', '.json']}}},
  cacheDir: 'node_modules/.vite-narration',
  resolve: {extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'], alias: {'react-native': path.resolve(root, '../node_modules/react-native-web')}},
  plugins: [{name: 'narration-fixtures', enforce: 'pre', resolveId(id, importer) {
    if (/\/theme\/ThemeContext$/.test(id)) return path.join(root, 'narrationThemeFixture.ts');
    if (id === './speechDriver') return path.resolve(root, '../src/accessibility/speechDriver.web.ts');
    if (id === './narrationEnvironment') return path.join(root, 'narrationNativeFixture.ts');
    if (id === '@react-native-async-storage/async-storage') return path.join(root, 'narrationStorageFixture.ts');
  }}],
  server: {host: '127.0.0.1', port: 5176, strictPort: true, fs: {allow: [path.resolve(root, '../..')]}},
};
