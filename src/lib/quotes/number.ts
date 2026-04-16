export function nextQuoteNumber() {
  const y = new Date();
  const ymd = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, "0")}${String(
    y.getDate(),
  ).padStart(2, "0")}`;
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `PRE-${ymd}-${rnd}`;
}
