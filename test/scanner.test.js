const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createFolderRoots, isInsideRoot, listDirectory, scanFolders } = require("../src/main/scanner");
const { formatModifiedDate } = require("../src/renderer/date-utils");

test("formats modified dates and safely labels missing or invalid dates", () => {
  const localNoon = new Date(2026, 9, 12, 12).toISOString();
  assert.equal(formatModifiedDate(localNoon), "Oct 12, 2026");
  assert.equal(formatModifiedDate(null), "Unknown");
  assert.equal(formatModifiedDate(""), "Unknown");
  assert.equal(formatModifiedDate("not a date"), "Unknown");
});

test("creates the six familiar folder roots from the desktop runtime", () => {
  const roots = createFolderRoots((name) => `C:\\Users\\Test\\${name}`);
  assert.deepEqual(roots.map(({ id }) => id), [
    "documents", "downloads", "desktop", "pictures", "music", "videos"
  ]);
  assert.equal(roots[0].path, "C:\\Users\\Test\\documents");
});

test("checks path containment without accepting sibling paths", () => {
  assert.equal(isInsideRoot(path.resolve("/tmp/home"), path.resolve("/tmp/home/docs")), true);
  assert.equal(isInsideRoot(path.resolve("/tmp/home"), path.resolve("/tmp/home-other/docs")), false);
});

test("scans real fixture files and lists a selected folder", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "organizer-scan-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const downloads = path.join(temporaryRoot, "Downloads");
  const nested = path.join(downloads, "Class");
  await fs.mkdir(nested, { recursive: true });
  const notesPath = path.join(downloads, "notes.txt");
  await fs.writeFile(notesPath, "Course notes");
  const knownModifiedDate = new Date("2026-10-12T12:00:00.000Z");
  await fs.utimes(notesPath, knownModifiedDate, knownModifiedDate);
  await fs.writeFile(path.join(nested, "report.pdf"), "fixture pdf");
  const roots = [{ id: "downloads", label: "Downloads", path: downloads }];

  const result = await scanFolders(roots);
  assert.equal(result[0].available, true);
  assert.equal(result[0].fileCount, 2);
  assert.deepEqual(
    result[0].files.map((file) => file.name).sort(),
    ["notes.txt", "report.pdf"]
  );
  assert.deepEqual(
    (await listDirectory(roots, "downloads")).map(({ name, kind }) => ({ name, kind })),
    [{ name: "Class", kind: "folder" }, { name: "notes.txt", kind: "file" }]
  );
  const directoryEntries = await listDirectory(roots, "downloads");
  assert.equal(
    directoryEntries.find((entry) => entry.name === "notes.txt").modifiedAt,
    knownModifiedDate.toISOString()
  );
});

test("reports inaccessible roots and rejects traversal outside a selected root", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "organizer-boundary-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const allowed = path.join(temporaryRoot, "allowed");
  await fs.mkdir(allowed);
  const missing = path.join(temporaryRoot, "missing");
  const roots = [
    { id: "downloads", label: "Downloads", path: allowed },
    { id: "documents", label: "Documents", path: missing }
  ];

  const results = await scanFolders(roots);
  assert.equal(results[1].available, false);
  assert.equal(results[1].path, missing);
  await assert.rejects(listDirectory(roots, "downloads", "../outside"), /outside the selected folder/);
});
