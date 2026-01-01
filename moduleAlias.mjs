import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const npmPackage = require('./package.json');

const getAliases = () => {
  const base = process.cwd();
  const aliases = npmPackage._moduleAliases || {};

  const absoluteAliases = Object.keys(aliases).reduce((acc, key) =>
    aliases[key][0] === '/'
      ? acc
      : { ...acc, [key]: path.join(base, aliases[key]) },
    aliases);

  return absoluteAliases;

}

const isAliasInSpecifier = (path, alias) => {
  return path.indexOf(alias) === 0
    && (path.length === alias.length || path[alias.length] === '/')
}

const aliases = getAliases();

export const resolve = (specifier, parentModuleURL, defaultResolve) => {
  const alias = Object.keys(aliases).find((key) => isAliasInSpecifier(specifier, key));
  let newSpecifier = alias === undefined
    ? specifier
    : path.join(aliases[alias], specifier.substr(alias.length));

  // Add .js extension if it's a local file without extension
  if (!newSpecifier.endsWith('.js') && !newSpecifier.endsWith('.json') && !newSpecifier.endsWith('.mjs') && !newSpecifier.startsWith('node:') && !newSpecifier.match(/^[a-z]/i)) {
    newSpecifier = newSpecifier + '.js';
  } else if (alias !== undefined && !newSpecifier.endsWith('.js') && !newSpecifier.endsWith('.json') && !newSpecifier.endsWith('.mjs')) {
    newSpecifier = newSpecifier + '.js';
  }

  return defaultResolve(newSpecifier, parentModuleURL);
}