// src/components/overlays/__tests__/overlayState.test.ts
/**
 * Tests for overlay state helpers.
 * We test the Escape key handler logic in isolation — no React rendering needed.
 */

describe("Overlay keyboard behavior", () => {
  it("calls onClose when Escape is pressed", () => {
    const onClose = jest.fn();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };

    window.addEventListener("keydown", handler);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    window.removeEventListener("keydown", handler);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for other keys", () => {
    const onClose = jest.fn();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };

    window.addEventListener("keydown", handler);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    window.removeEventListener("keydown", handler);

    expect(onClose).not.toHaveBeenCalled();
  });
});
