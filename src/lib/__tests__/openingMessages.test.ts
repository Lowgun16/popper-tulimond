import { announceMessage, reminderMessage, earlybirdMessage } from "../openingMessages";

const opensAt = new Date("2026-08-25T04:00:00Z"); // midnight EDT
const tz = "America/New_York";

test("announce uses default template with formatted date/time", () => {
  const msg = announceMessage(opensAt, tz);
  expect(msg).toContain("August 25");
  expect(msg).toContain("12:00 AM");
  expect(msg).toContain("Popper Tulimond");
});
test("announce appends opt-out language to a custom body", () => {
  expect(announceMessage(opensAt, tz, "Custom heads up")).toBe("Custom heads up Reply STOP to opt out.");
});
test("does not double-add opt-out when the custom body already has STOP", () => {
  const msg = "Custom. Reply STOP to opt out.";
  expect(announceMessage(opensAt, tz, msg)).toBe(msg);
});
test("reminder embeds the early access link", () => {
  expect(reminderMessage(opensAt, tz, "https://x/early/abc")).toContain("https://x/early/abc");
});
test("earlybird embeds the link and urgency", () => {
  const m = earlybirdMessage("https://x/early/abc");
  expect(m).toContain("https://x/early/abc");
  expect(m.toLowerCase()).toContain("before");
});
test("every marketing message carries opt-out language", () => {
  expect(announceMessage(opensAt, tz)).toContain("Reply STOP to opt out.");
  expect(reminderMessage(opensAt, tz, "https://x/early/abc")).toContain("Reply STOP to opt out.");
  expect(earlybirdMessage("https://x/early/abc")).toContain("Reply STOP to opt out.");
});
