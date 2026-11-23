/**
 * Shared types between VivechakLogoHero (WebGL) and VivechakLogoCanvas2D (Canvas2D).
 * Extracted to break the circular dependency between the two logo components.
 */

export type SieveMode = 'sift' | 'noise' | 'sealed';
