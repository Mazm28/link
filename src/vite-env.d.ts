/// <reference types="vite/client" />

/** Build-time flag from vite.config.ts. False in production builds, so the
 *  dev menu is compiled out rather than hidden at runtime. */
declare const __DEV_MENU__: boolean;
