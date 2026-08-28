/**
 * Money in integer cents.
 *
 * Every figure that reaches an executed document is derived here. Nothing is
 * typed twice, so the page, the PDF and the tests cannot disagree, and no float
 * tail can appear in a total. Lifted from the Bluebill agreement, where it has
 * carried a real signed lease, and generalized only where the wording was
 * specific to that one document.
 */

/** A whole number of US cents. Never a float, never a formatted string. */
export type Cents = number;

export function cents(dollars: number, hundredths: number): Cents {
  if (!Number.isInteger(dollars) || !Number.isInteger(hundredths)) {
    throw new Error("cents() takes two integers, for example cents(3695, 0).");
  }
  if (hundredths < 0 || hundredths > 99) {
    throw new Error("The second argument to cents() is 0 to 99.");
  }
  return dollars * 100 + hundredths;
}

/** "$3,995.00". The only place a money string is built. */
export function usd(v: Cents): string {
  if (!Number.isInteger(v)) {
    throw new Error(`usd() was handed ${v}, which is not whole cents.`);
  }
  const neg = v < 0;
  const abs = Math.abs(v);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}$${whole}.${frac}`;
}

/**
 * Split a total into n equal parts, refusing rather than rounding.
 *
 * A tenant paying on two cards must see the same number on the invoice as the
 * agreement states. If a total stops dividing exactly, this throws and the
 * build fails instead of quietly shipping a cent that does not reconcile.
 */
export function splitEvenly(total: Cents, n: number): Cents[] {
  if (!Number.isInteger(total)) throw new Error("splitEvenly() needs whole cents.");
  if (!Number.isInteger(n) || n < 1) throw new Error("splitEvenly() needs a positive count.");
  if (total % n !== 0) {
    throw new Error(
      `${usd(total)} does not divide into ${n} equal payments. ` +
        `Adjust the figure rather than rounding a payment.`
    );
  }
  return Array.from({ length: n }, () => total / n);
}

/** Sum a set of lines. Present so no surface adds money by hand. */
export function total(lines: { amount: Cents; isTotal?: boolean }[]): Cents {
  return lines.filter((l) => !l.isTotal).reduce((a, l) => a + l.amount, 0);
}
