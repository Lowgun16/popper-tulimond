// Ensure DATABASE_URL is set so db.ts doesn't throw during module import in tests
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://test:test@localhost/test";

// Mock canvas for jsdom (jsdom doesn't implement canvas)
class MockCanvas {
  getContext() {
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      toDataURL: jest.fn(() => "data:image/png;base64,mock"),
      canvas: { toDataURL: jest.fn(() => "data:image/png;base64,mock") },
    };
  }
  toDataURL() {
    return "data:image/png;base64,mock";
  }
}
(global as any).HTMLCanvasElement = MockCanvas;

// Polyfill TextDecoder and TextEncoder for @neondatabase/serverless
if (typeof global.TextDecoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextDecoder, TextEncoder } = require("util");
  (global as any).TextDecoder = TextDecoder;
  (global as any).TextEncoder = TextEncoder;
}
