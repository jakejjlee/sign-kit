import { describe, expect, it } from "vitest";

import { makeRecord } from "../src/lib/execution";
import { driveWriteWith } from "../src/lib/store";
import { agreementFor } from "./email-fixtures";

const a = agreementFor("palisade-lincoln");
const rec = makeRecord(
  a,
  { party: "owner", legalName: "Michael Williams", typed: "Michael Williams", email: "m@example.com" },
  { fingerprint: "f", ip: null, userAgent: null },
  new Date("2026-11-24T20:00:00Z")
);

type F = { id: string; name: string; createdTime: string };

/** A fake Drive where two requests can both list "empty", then both create. */
function fakeDrive(files: F[], opts: { staleFirstList: boolean }) {
  let listCalls = 0;
  let nextId = 1;
  return {
    files,
    drive: {
      files: {
        list: async () => {
          listCalls += 1;
          const visible = opts.staleFirstList && listCalls === 1 ? [] : files;
          return { data: { files: visible.map((f) => ({ ...f })) } };
        },
        create: async (req: { requestBody: { name: string } }) => {
          const id = `mine-${nextId++}`;
          files.push({ id, name: req.requestBody.name, createdTime: "2026-11-24T20:00:02.000Z" });
          return { data: { id } };
        },
        update: async (req: { fileId: string; requestBody: { name: string } }) => {
          const f = files.find((x) => x.id === req.fileId);
          if (f) f.name = req.requestBody.name;
          return { data: {} };
        },
      },
    },
  };
}

describe("SG-7 a Drive create re-lists and answers already-signed when an earlier record exists", () => {
  it("returns already-signed (no second email) when a racing request filed first", async () => {
    const name = `${a.id}--owner.json`;
    // The other request's file is not visible to our first list, but is earlier than ours.
    const other: F = { id: "theirs", name, createdTime: "2026-11-24T20:00:01.000Z" };
    const { drive } = fakeDrive([other], { staleFirstList: true });
    const res = await driveWriteWith(drive as never, "folder", rec);
    expect(res).toEqual({ ok: false, reason: "already-signed" });
  });

  it("returns ok when ours is the earliest", async () => {
    const { drive } = fakeDrive([], { staleFirstList: false });
    expect(await driveWriteWith(drive as never, "folder", rec)).toEqual({ ok: true });
  });

  it("returns already-signed up front when a record is already there", async () => {
    const name = `${a.id}--owner.json`;
    const { drive } = fakeDrive([{ id: "old", name, createdTime: "2026-11-24T19:00:00.000Z" }], { staleFirstList: false });
    expect(await driveWriteWith(drive as never, "folder", rec)).toEqual({ ok: false, reason: "already-signed" });
  });
});
