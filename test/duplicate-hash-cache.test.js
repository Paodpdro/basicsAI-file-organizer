const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createDuplicateHashCache } = require("../src/main/duplicate-hash-cache");

test("persists digests only for matching path, size, and modified date", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "organizer-hash-cache-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const cachePath = path.join(temporaryRoot, "user-data", "duplicate-hashes.json");
  const file = {
    path: path.join(temporaryRoot, "same-size.txt"),
    sizeBytes: 12,
    modifiedAt: "2026-10-25T00:00:00.000Z"
  };
  const digest = "a".repeat(64);
  const firstCache = await createDuplicateHashCache(cachePath, [file]);

  assert.equal(firstCache.get(file), null);
  firstCache.set(file, digest);
  await firstCache.flush();

  const saved = await fs.readFile(cachePath, "utf8");
  assert.deepEqual(JSON.parse(saved), {
    version: 1,
    entries: [{
      path: path.resolve(file.path),
      sizeBytes: 12,
      modifiedAt: file.modifiedAt,
      sha256: digest
    }]
  });
  assert.equal(saved.includes("contents"), false);

  const matchingCache = await createDuplicateHashCache(cachePath, [file]);
  assert.equal(matchingCache.get(file), digest);
  await matchingCache.flush();

  const changedSize = await createDuplicateHashCache(cachePath, [{
    ...file,
    sizeBytes: 13
  }]);
  assert.equal(changedSize.get({ ...file, sizeBytes: 13 }), null);
  await changedSize.flush();
  assert.deepEqual(JSON.parse(await fs.readFile(cachePath, "utf8")).entries, []);
});

test("drops cached hashes for paths no longer in the current inventory", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "organizer-hash-cache-prune-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const cachePath = path.join(temporaryRoot, "hashes.json");
  const firstFile = {
    path: path.join(temporaryRoot, "first.txt"),
    sizeBytes: 1,
    modifiedAt: "2026-10-25T00:00:00.000Z"
  };
  const secondFile = {
    ...firstFile,
    path: path.join(temporaryRoot, "second.txt")
  };
  const initial = await createDuplicateHashCache(cachePath, [firstFile, secondFile]);
  initial.set(firstFile, "b".repeat(64));
  initial.set(secondFile, "c".repeat(64));
  await initial.flush();

  const current = await createDuplicateHashCache(cachePath, [firstFile]);
  await current.flush();
  const saved = JSON.parse(await fs.readFile(cachePath, "utf8"));

  assert.deepEqual(saved.entries.map((entry) => entry.path), [path.resolve(firstFile.path)]);
});

test("reports invalid cache data instead of silently trusting or resetting it", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "organizer-hash-cache-invalid-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const cachePath = path.join(temporaryRoot, "hashes.json");
  await fs.writeFile(cachePath, "{invalid");

  await assert.rejects(
    createDuplicateHashCache(cachePath, []),
    /Could not read the duplicate hash cache/
  );
});
