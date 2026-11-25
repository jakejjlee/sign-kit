/**
 * Reading the sign route's answer, and tying an error to its field.
 *
 * Pure, so the rules that once shipped a false "signed" screen are tested
 * without a browser.
 */

export type SignResponseData = {
  ok?: boolean;
  error?: string;
  field?: string;
  alreadySigned?: boolean;
};

export type SignOutcome =
  | { kind: "already-signed" }
  | { kind: "recorded" }
  | { kind: "error"; message: string; field: string | undefined };

/**
 * "Already signed" is the one non-success that counts as done, and only when the
 * server says so. A 409 alone proves nothing: the route once answered 409 for a
 * closed gate too, and the panel told a signer they were finished while nothing
 * had been stored.
 */
export function classifySignResponse(status: number, data: SignResponseData): SignOutcome {
  if (status === 409 && data.alreadySigned === true) return { kind: "already-signed" };
  if (status >= 200 && status < 300 && data.ok) return { kind: "recorded" };
  return { kind: "error", message: data.error ?? "Something went wrong. Please try again.", field: data.field };
}

/**
 * aria attributes for one input: invalid only when the API named this field,
 * described by the shared error element only then.
 */
export function fieldAria(
  forField: string,
  errorField: string | undefined,
  error: string | null,
  hintId: string
): { "aria-invalid": true | undefined; "aria-describedby": string } {
  const mine = Boolean(error) && errorField === forField;
  return {
    "aria-invalid": mine ? true : undefined,
    "aria-describedby": mine ? `${hintId} sk-error` : hintId,
  };
}
