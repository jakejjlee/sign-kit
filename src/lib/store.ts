/**
 * Where executed signatures live.
 *
 * Two adapters. In production, signatures are filed as JSON in a shared Drive
 * folder through a service account that is already a member of that drive.
 * Locally they go to a gitignored file, so the whole flow can be exercised
 * without a single credential.
 *
 * The rule that matters: if the store is unreachable, signing FAILS. It never
 * returns success. Telling someone their signature landed when nothing was
 * stored is the one outcome this file exists to prevent.
 *
 * Ported from the Bluebill agreement and keyed by agreement id, so one folder
 * holds every agreement across every business without them colliding.
 */

import type { Agreement } from "../content/types";
import { isValidRecord, type Execution, type SignatureRecord } from "./execution";

const FOLDER_ID = process.env.AGREEMENTS_DRIVE_FOLDER_ID;
const SERVICE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

export type StoreKind = "drive" | "local" | "none";

export function storeKind(): StoreKind {
  if (FOLDER_ID && SERVICE_KEY) return "drive";
  if (process.env.NODE_ENV !== "production") return "local";
  return "none";
}

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "already-signed" }
  | { ok: false; reason: "unavailable"; detail: string };

const fileNameFor = (agreementId: string, party: string) => `${agreementId}--${party}.json`;

const DRIVE_TIMEOUT_MS = 10_000;

/* ----------------------------------------------------------------- drive -- */

async function driveClient() {
  const { google } = await import("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(SERVICE_KEY as string),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  // Bounded on purpose. An unbounded Drive call ran the route to the platform
  // timeout, which surfaced to the signer as a failure for a write that had in
  // fact succeeded.
  return google.drive({ version: "v3", auth, timeout: DRIVE_TIMEOUT_MS });
}

async function driveRead(agreement: Agreement): Promise<Execution> {
  const drive = await driveClient();
  const list = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name contains '${agreement.id}' and trashed = false`,
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 100,
  });

  const signatures: Execution["signatures"] = {};
  for (const f of list.data.files ?? []) {
    if (!f.id) continue;
    const res = await drive.files.get(
      { fileId: f.id, alt: "media", supportsAllDrives: true },
      { responseType: "json" }
    );
    const rec = res.data as unknown;
    // A foreign or malformed file in this folder is permanent, because the
    // service account cannot delete. One bad record used to throw while
    // formatting its date and take down every page load and every PDF with no
    // way to remove it. Anything that does not validate is ignored instead.
    if (!isValidRecord(rec, agreement)) continue;
    // Earliest write per party wins, so a double-click cannot overwrite one.
    if (!signatures[rec.party]) signatures[rec.party] = rec;
  }
  return { signatures };
}

async function driveWrite(rec: SignatureRecord): Promise<WriteResult> {
  const drive = await driveClient();
  const name = fileNameFor(rec.agreementId, rec.party);

  const existing = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name = '${name}' and trashed = false`,
    fields: "files(id)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 1,
  });
  if ((existing.data.files ?? []).length > 0) return { ok: false, reason: "already-signed" };

  await drive.files.create({
    requestBody: { name, parents: [FOLDER_ID as string], mimeType: "application/json" },
    media: { mimeType: "application/json", body: JSON.stringify(rec, null, 2) },
    fields: "id",
    supportsAllDrives: true,
  });
  return { ok: true };
}

/* ----------------------------------------------------------------- local -- */

const LOCAL_DIR = ".data";
const localFile = (id: string) => `${LOCAL_DIR}/${id}.json`;

async function localRead(agreement: Agreement): Promise<Execution> {
  const { readFile } = await import("node:fs/promises");
  try {
    const raw = await readFile(localFile(agreement.id), "utf8");
    return JSON.parse(raw) as Execution;
  } catch {
    return { signatures: {} };
  }
}

async function localWrite(agreement: Agreement, rec: SignatureRecord): Promise<WriteResult> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const current = await localRead(agreement);
  if (current.signatures[rec.party]) return { ok: false, reason: "already-signed" };
  current.signatures[rec.party] = rec;
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(localFile(agreement.id), JSON.stringify(current, null, 2), "utf8");
  return { ok: true };
}

/* ------------------------------------------------------------------ api --- */

/**
 * Prove the configured store really accepts a write and returns it.
 *
 * A page that renders is not evidence that signing works, and the first time we
 * find out otherwise must not be the moment a signer taps sign. This writes and
 * reads back a throwaway record whose name deliberately does NOT contain the
 * agreement id, so it is invisible to readExecution() and can never occupy a
 * real party's slot. The payload is shaped like a real signature, because a
 * store that accepts `{probe:true}` is no evidence it will accept the record
 * that actually matters.
 */
export async function probeStore(agreement: Agreement): Promise<{
  ok: boolean;
  kind: StoreKind;
  detail: string;
}> {
  const kind = storeKind();
  const name = `healthcheck-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const payload = {
    probe: true,
    at: new Date().toISOString(),
    agreementId: agreement.id,
    party: "probe-not-a-party",
    legalName: "Health Probe",
    typed: "Health Probe",
    version: "0001-01-01",
    signedOn: "0001-01-01",
    signedAt: "0001-01-01T00:00:00.000Z",
    signedAtLocal: "probe",
    acceptedAttachments: true,
    consentedToElectronicSignature: true,
    ip: null,
    userAgent: null,
  };

  try {
    if (kind === "drive") {
      const drive = await driveClient();
      const created = await drive.files.create({
        requestBody: { name, parents: [FOLDER_ID as string], mimeType: "application/json" },
        media: { mimeType: "application/json", body: JSON.stringify(payload) },
        fields: "id",
        supportsAllDrives: true,
      });
      const id = created.data.id;
      if (!id) return { ok: false, kind, detail: "Drive accepted the write but returned no file id." };

      const back = await drive.files.get(
        { fileId: id, alt: "media", supportsAllDrives: true },
        { responseType: "json" }
      );
      const read = back.data as { probe?: boolean };
      // Both halves matter: it came back whole, AND a record naming a party
      // this agreement does not have is refused.
      const roundTripped = read?.probe === true && !isValidRecord(read, agreement);

      // Retire the probe file. The service account cannot delete, so it is
      // renamed out of the way. Without this every health call left a permanent
      // file in a folder shared with other agreements, on a drive with a hard
      // cap of 500,000 items.
      try {
        await drive.files.update({
          fileId: id,
          requestBody: { name: `ZZ-probe-${name}` },
          supportsAllDrives: true,
        });
      } catch {
        // The probe already proved what it needed to; tidying is best effort.
      }

      return {
        ok: roundTripped,
        kind,
        detail: roundTripped
          ? "Wrote and read back a signature-shaped probe record, and it was correctly refused as not naming a party on this agreement."
          : "Drive returned a file that does not match what was written, or accepted a record it should have refused.",
      };
    }

    if (kind === "local") {
      const { mkdir, writeFile, readFile, rm } = await import("node:fs/promises");
      await mkdir(LOCAL_DIR, { recursive: true });
      const path = `${LOCAL_DIR}/${name}`;
      await writeFile(path, JSON.stringify(payload), "utf8");
      const back = JSON.parse(await readFile(path, "utf8")) as { probe?: boolean };
      await rm(path, { force: true });
      return {
        ok: back.probe === true && !isValidRecord(back, agreement),
        kind,
        detail: "Local file store round-tripped.",
      };
    }

    return {
      ok: false,
      kind,
      detail:
        "No signature store is configured. Set GOOGLE_SERVICE_ACCOUNT_KEY and " +
        "AGREEMENTS_DRIVE_FOLDER_ID. Until then the sign route returns 503 and records nothing.",
    };
  } catch (err) {
    console.error("[sign-kit] store probe failed:", err);
    return {
      ok: false,
      kind,
      detail: "The signature store did not accept a test write. The detail is in the server logs.",
    };
  }
}

export async function readExecution(agreement: Agreement): Promise<Execution> {
  const kind = storeKind();
  if (kind === "drive") return driveRead(agreement);
  if (kind === "local") return localRead(agreement);
  // Production with no store configured. Report nothing signed rather than
  // inventing a state, and let the write path refuse loudly.
  return { signatures: {} };
}

export async function writeSignature(
  agreement: Agreement,
  rec: SignatureRecord
): Promise<WriteResult> {
  const kind = storeKind();
  try {
    if (kind === "drive") return await driveWrite(rec);
    if (kind === "local") return await localWrite(agreement, rec);
    return {
      ok: false,
      reason: "unavailable",
      detail:
        "Signature store is not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY and " +
        "AGREEMENTS_DRIVE_FOLDER_ID before this page is shared.",
    };
  } catch (err) {
    return {
      ok: false,
      reason: "unavailable",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
