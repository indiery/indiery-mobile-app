const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];
config.resolver.blockList = [
  /node_modules[\\/]expo-modules-autolinking[\\/]android[\\/]expo-gradle-plugin[\\/].*[\\/]build[\\/].*/
];

module.exports = config;
