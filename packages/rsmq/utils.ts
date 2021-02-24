export function clamp(
  value: number,
  min?: number,
  max?: number,
): number {
  let adjustedValue = value;
  if (min != null) {
    adjustedValue = Math.max(min, value);
  }
  if (max != null) {
    adjustedValue = Math.min(max, adjustedValue);
  }
  return adjustedValue;
}

export function randomString(length: number): string {
  let str = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return str;
}
