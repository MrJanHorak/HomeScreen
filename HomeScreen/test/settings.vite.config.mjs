import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default {
  root,
  esbuild: {jsx: 'automatic'},
  optimizeDeps: {entries: ['settings.html'], rolldownOptions: {moduleTypes: {'.js': 'jsx'}}},
  resolve: {extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'], alias: {'react-native': path.resolve(root, '../node_modules/react-native-web')}},
  plugins: [{name: 'settings-fixtures', enforce: 'pre', resolveId(id) {
    if (/\/(context\/AuthContext|context\/PollsContext|services\/api)$/.test(id) || id === '@react-native-async-storage/async-storage') return path.join(root, 'settingsFixture.ts');
  }}],
  server: {host: '127.0.0.1', port: 5175, strictPort: true, fs: {allow: [path.resolve(root, '../..')]}},
};
