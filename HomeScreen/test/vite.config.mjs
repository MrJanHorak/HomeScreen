import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default {
  root,
  esbuild: {jsx: 'automatic'},
  plugins: [{name: 'card-fixture-hooks', enforce: 'pre', resolveId(id) {
    if (/\/(context\/DashboardContext|hooks\/useWatchNext|hooks\/useCompactTVLayout|theme\/ThemeContext)$/.test(id)) return path.join(root, 'fixtureHooks.tsx');
  }}],
  resolve: {alias: {'react-native': path.resolve(root, '../node_modules/react-native-web'), '@expo/vector-icons': path.join(root, 'fixtureIcons.tsx')}},
  server: {host: '127.0.0.1', port: 5174, fs: {allow: [path.resolve(root, '../..')]}},
};
