import { TextEncoder, TextDecoder } from "util";

// jsdom (CRA's default Jest test environment) doesn't implement these; react-router
// depends on them transitively at import time.
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// jsdom doesn't implement matchMedia; useTheme() reads it to pick a default theme.
if (typeof window.matchMedia === "undefined") {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

import "@testing-library/jest-dom";
