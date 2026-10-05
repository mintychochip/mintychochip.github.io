import JavaScriptObfuscator from 'javascript-obfuscator';

/** Property shared by the seal chunk and the door chunk. Renamed in both. */
const SEALED_OPEN = '_0xa91c3e';

/**
 * Build-time only. Turns local names in a vault chunk into hexadecimal
 * identifiers. Import specifiers and the names other chunks import or export
 * stay as they are. This calls the local obfuscator, never the network API.
 */
export function obfuscateVaultChunk(code: string, controlFlow = false): string {
  const hits = code.split('openSealedVault').length - 1;
  if (hits > 8) throw new Error(`refusing to rename openSealedVault ${hits} times`);

  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    target: 'browser',
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: true,
    ignoreImports: true,
    renameProperties: false,
    selfDefending: false,
    debugProtection: false,
    disableConsoleOutput: false,
    deadCodeInjection: false,
    controlFlowFlattening: controlFlow,
    controlFlowFlatteningThreshold: 0.75,
    stringArray: false,
    splitStrings: false,
    unicodeEscapeSequence: false,
    numbersToExpressions: false,
    simplify: true,
    transformObjectKeys: false,
    advertisement: false,
    sourceMap: false,
    seed: 0x5ea1,
    reservedNames: [`^${SEALED_OPEN}$`],
  }).getObfuscatedCode();

  return obfuscated.replaceAll('openSealedVault', SEALED_OPEN);
}
