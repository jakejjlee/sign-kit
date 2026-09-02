"use client";

import { useInitials } from "./initials";
import s from "./formal.module.css";

/**
 * One clause, initialed.
 *
 * Sits in the outer margin beside its clause number, which is where a paper
 * lease puts it and why the sheet carries a wider left margin than the measure
 * needs. On an executed copy it is a record rather than a control, so it stops
 * being a button.
 */
export function InitialBox({ clause }: { clause: string }) {
  const { typed, stamped, stamp, filed } = useInitials();
  const mark = stamped[clause];
  const armed = typed.trim().length > 0;

  if (mark) {
    return (
      <div className={s.iniWrap}>
        <span className={`${s.iniBox} ${s.iniOn}`} aria-hidden="true">
          {mark.initials}
        </span>
        <span className={s.iniCap}>{filed ? "Initialed" : "Initialed"}</span>
        <span className={s.srOnly}>
          Section {clause} initialed {mark.initials}
        </span>
      </div>
    );
  }

  if (filed) {
    return (
      <div className={s.iniWrap}>
        <span className={s.iniBox} aria-hidden="true" />
        <span className={s.iniCap}>Not initialed</span>
        <span className={s.srOnly}>Section {clause} was not initialed</span>
      </div>
    );
  }

  return (
    <div className={s.iniWrap}>
      <button
        type="button"
        className={s.iniBox}
        onClick={() => stamp(clause)}
        disabled={!armed}
        aria-label={
          armed
            ? `Initial section ${clause}`
            : `Type your initials in the signature block before initialing section ${clause}`
        }
      >
        {armed ? typed.trim() : ""}
      </button>
      <span className={s.iniCap}>{armed ? "Tap to initial" : "Initials first"}</span>
    </div>
  );
}
