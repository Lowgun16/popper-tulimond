const STORAGE_KEY = "pt_model_preference";

beforeEach(() => {
  localStorage.clear();
});

describe("model preference localStorage contract", () => {
  function readPref(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }
  function writePref(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
  }
  function clearPref() {
    localStorage.removeItem(STORAGE_KEY);
  }

  it("starts null when nothing is stored", () => {
    expect(readPref()).toBeNull();
  });

  it("stores a model id", () => {
    writePref("angel");
    expect(readPref()).toBe("angel");
  });

  it("overwrites an existing preference", () => {
    writePref("angel");
    writePref("jerome");
    expect(readPref()).toBe("jerome");
  });

  it("clears the preference", () => {
    writePref("jack");
    clearPref();
    expect(readPref()).toBeNull();
  });
});
