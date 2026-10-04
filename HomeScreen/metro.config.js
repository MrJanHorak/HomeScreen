const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// This repository uses separate app directories rather than package workspaces.
// The layout contract is pure TypeScript; no server dependencies enter the TV bundle.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../server/functions/src/utils')];

module.exports = config;
