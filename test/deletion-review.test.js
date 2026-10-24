const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  buildDeletionCandidates,
  createDeletionReviewQueue,
  isOlderThanOneYear
} = require("../src/main/deletion-review");

async function createFixture(t) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "organizer-deletions-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const root = {
    id: "documents",
    label: "Documents",
    path: path.join(temporaryRoot, "Documents")
  };
  await fs.mkdir(root.path);
  root.path = await fs.realpath(root.path);
  return { root, temporaryRoot };
}

async function createFileRecord(root, fileName, contents, modifiedAt = new Date()) {
  const filePath = path.join(root.path, fileName);
  await fs.writeFile(filePath, contents);
  await fs.utimes(filePath, modifiedAt, modifiedAt);
  const stats = await fs.stat(filePath);
  return {
    name: fileName,
    path: filePath,
    rootId: root.id,
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString()
  };
}

test("flags exact-content duplicates but not files that only have similar names", async (t) => {
  const { root } = await createFixture(t);
  const sameDate = new Date("2026-10-01T00:00:00.000Z");
  const newest = await createFileRecord(root, "report-final.txt", "same bytes", sameDate);
  const duplicate = await createFileRecord(root, "report-copy.txt", "same bytes", sameDate);
  const different = await createFileRecord(root, "report-final-2.txt", "other bytes", sameDate);

  const result = await buildDeletionCandidates(
    [root],
    [newest, duplicate, different],
    { now: new Date("2026-10-24T00:00:00.000Z") }
  );

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].fileName, "report-final.txt");
  assert.deepEqual(result.candidates[0].reasonTags, ["duplicate"]);
  assert.equal(result.candidates[0].duplicateOf.fileName, "report-copy.txt");
  assert.equal(result.issues.length, 0);
});

test("flags only files modified strictly more than one year before the scan date", async (t) => {
  const { root } = await createFixture(t);
  const now = new Date("2026-10-24T00:00:00.000Z");
  const beyondCutoff = await createFileRecord(
    root,
    "older-than-one-year.txt",
    "older",
    new Date("2025-10-23T23:59:59.999Z")
  );
  const atCutoff = await createFileRecord(
    root,
    "exactly-one-year.txt",
    "boundary",
    new Date("2025-10-24T00:00:00.000Z")
  );

  const result = await buildDeletionCandidates([root], [beyondCutoff, atCutoff], { now });

  assert.deepEqual(result.candidates.map((candidate) => candidate.fileName), [
    "older-than-one-year.txt"
  ]);
  assert.ok(isOlderThanOneYear(beyondCutoff.modifiedAt, new Date("2025-10-24T00:00:00.000Z").getTime()));
  assert.equal(isOlderThanOneYear(atCutoff.modifiedAt, new Date("2025-10-24T00:00:00.000Z").getTime()), false);
});

test("Keep leaves a file unchanged and confirmed deletion uses the injected Recycle Bin operation", async (t) => {
  const { root, temporaryRoot } = await createFixture(t);
  const kept = await createFileRecord(root, "keep-this.txt", "keep");
  const deleted = await createFileRecord(root, "send-to-bin.txt", "delete");
  const oldDate = new Date("2020-01-01T00:00:00.000Z");
  await fs.utimes(kept.path, oldDate, oldDate);
  await fs.utimes(deleted.path, oldDate, oldDate);
  const keptStats = await fs.stat(kept.path);
  const deletedStats = await fs.stat(deleted.path);
  const candidates = (await buildDeletionCandidates(
    [root],
    [
      { ...kept, sizeBytes: keptStats.size, modifiedAt: keptStats.mtime.toISOString() },
      { ...deleted, sizeBytes: deletedStats.size, modifiedAt: deletedStats.mtime.toISOString() }
    ],
    { now: new Date("2026-10-24T00:00:00.000Z") }
  )).candidates;
  const recycleBin = path.join(temporaryRoot, "recycle-bin");
  await fs.mkdir(recycleBin);
  const trashedPaths = [];
  const queue = createDeletionReviewQueue([root], candidates, async (filePath) => {
    trashedPaths.push(filePath);
    await fs.rename(filePath, path.join(recycleBin, path.basename(filePath)));
  });
  const byName = new Map(candidates.map((candidate) => [candidate.fileName, candidate]));

  await queue.keep(byName.get("keep-this.txt").id);
  assert.equal(await fs.readFile(kept.path, "utf8"), "keep");
  assert.equal(trashedPaths.length, 0);

  await queue.delete(byName.get("send-to-bin.txt").id);
  assert.deepEqual(trashedPaths, [deleted.path]);
  await assert.rejects(fs.access(deleted.path), { code: "ENOENT" });
  assert.equal(await fs.readFile(path.join(recycleBin, "send-to-bin.txt"), "utf8"), "delete");
});

test("does not delete a file whose metadata changed after its review candidate was prepared", async (t) => {
  const { root } = await createFixture(t);
  const record = await createFileRecord(
    root,
    "changed.txt",
    "before",
    new Date("2020-01-01T00:00:00.000Z")
  );
  const candidates = (await buildDeletionCandidates(
    [root],
    [record],
    { now: new Date("2026-10-24T00:00:00.000Z") }
  )).candidates;
  await fs.writeFile(record.path, "changed after scan");
  let trashCalled = false;
  const queue = createDeletionReviewQueue([root], candidates, async () => {
    trashCalled = true;
  });

  await assert.rejects(queue.delete(candidates[0].id), /changed after scanning/);
  assert.equal(trashCalled, false);
  assert.equal(queue.list().length, 1);
});

test("reports files outside approved roots instead of suggesting them for deletion", async (t) => {
  const { root, temporaryRoot } = await createFixture(t);
  const outsidePath = path.join(temporaryRoot, "outside.txt");
  await fs.writeFile(outsidePath, "not in Documents");
  const stats = await fs.stat(outsidePath);

  const result = await buildDeletionCandidates([root], [{
    name: "outside.txt",
    path: outsidePath,
    rootId: root.id,
    sizeBytes: stats.size,
    modifiedAt: new Date("2020-01-01T00:00:00.000Z").toISOString()
  }], { now: new Date("2026-10-24T00:00:00.000Z") });

  assert.equal(result.candidates.length, 0);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].reason, /outside the approved folders/);
});
