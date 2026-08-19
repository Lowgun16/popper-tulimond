const create = jest.fn().mockResolvedValue({ sid: "SM1" });
jest.mock("twilio", () => jest.fn(() => ({ messages: { create } })));

describe("sendSms", () => {
  const OLD = process.env;
  beforeEach(() => {
    jest.resetModules();
    create.mockClear();
    process.env = { ...OLD, TWILIO_ACCOUNT_SID: "AC", TWILIO_AUTH_TOKEN: "tok", TWILIO_FROM_NUMBER: "+1999" };
  });
  afterAll(() => { process.env = OLD; });

  test("sends and returns true", async () => {
    const { sendSms } = await import("../sms");
    const ok = await sendSms("+15551234567", "hi");
    expect(ok).toBe(true);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ to: "+15551234567", body: "hi", from: "+1999" }));
  });

  test("returns false (does not throw) when Twilio errors", async () => {
    create.mockRejectedValueOnce(new Error("boom"));
    const { sendSms } = await import("../sms");
    expect(await sendSms("+15551234567", "hi")).toBe(false);
  });

  test("batch counts sent and failed", async () => {
    create.mockResolvedValueOnce({ sid: "a" }).mockRejectedValueOnce(new Error("x"));
    const { sendSmsBatch } = await import("../sms");
    const r = await sendSmsBatch([{ to: "+1", body: "a" }, { to: "+2", body: "b" }]);
    expect(r).toEqual({ sent: 1, failed: 1 });
  });
});
