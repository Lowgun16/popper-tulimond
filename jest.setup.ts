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
