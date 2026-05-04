export function formatPrice(cents: number): string {
  return `$${Math.floor(cents / 100).toLocaleString("en-US")}`;
}
