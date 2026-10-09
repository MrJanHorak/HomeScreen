import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export default {
  root,
  esbuild: {jsx: 'automatic'},
  optimizeDeps: {rolldownOptions: {moduleTypes: {'.js': 'jsx'}, resolve: {extensions: ['.web.js', '.js', '.mjs', '.ts', '.tsx', '.json']}}},
  resolve: {extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'], alias: {'react-native': path.resolve(root, '../node_modules/react-native-web'), 'react-native-svg': path.resolve(root, '../node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js'), '@expo/vector-icons': path.join(root, 'fixtureIcons.tsx')}},
  plugins: [{name: 'card-fixture-hooks', enforce: 'pre', resolveId(id) {
    if (id === './speechDriver') return path.resolve(root, '../src/accessibility/speechDriver.web.ts');
    if (id === './narrationEnvironment') return path.resolve(root, '../src/accessibility/narrationEnvironment.web.ts');
    if (/\/(context\/DashboardContext|context\/PollsContext|context\/PeopleContext|hooks\/useWatchNext|hooks\/useCompactTVLayout|theme\/ThemeContext)$/.test(id)) return path.join(root, 'fixtureHooks.tsx');
  }}],
  server: {host: '127.0.0.1', port: 5174, fs: {allow: [path.resolve(root, '../..')]}},
};
