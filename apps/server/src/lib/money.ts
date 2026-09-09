export type Paisa = number; // integer

export function toPaisa(rupees: string | number): Paisa {
  const str = String(rupees);
  const [whole, frac = ""] = str.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  const sign = whole.startsWith("-") ? -1 : 1;
  const wholeAbs = whole.replace("-", "");
  return sign * (Number(wholeAbs) * 100 + Number(fracPadded));
}

export function toRupees(p: Paisa): string {
  const sign = p < 0 ? "-" : "";
  const abs = Math.abs(Math.round(p));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${String(frac).padStart(2, "0")}`;
}

export function mul(p: Paisa, qty: number): Paisa {
  return Math.round(p * qty);
}

export function taxOn(sale: Paisa, ratePercent: number): Paisa {
  return Math.round((sale * ratePercent) / 100);
}
