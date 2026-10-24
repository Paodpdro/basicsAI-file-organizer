const fs = require("node:fs/promises");
const { createHash, randomUUID } = require("node:crypto");
const path = require("node:path");
const { isInsideRoot, resolveFilePath } = require("./scanner");

function oneYearBefore(now) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff.getTime();
}

function isOlderThanOneYear(modifiedAt, cutoff) {
  const modifiedTime = Date.parse(modifiedAt);
  return Number.isFinite(modifiedTime) && modifiedTime < cutoff;
}

function unchangedSinceScan(file, stats) {
  return stats.size === file.sizeBytes && stats.mtime.toISOString() === file.modifiedAt;
}

async function hashFile(roots, file, canonicalRoots) {
  const root = roots.find((item) => item.id === file.rootId);
  const canonicalRoot = canonicalRoots.get(file.rootId);
  if (!root || !canonicalRoot || !isInsideRoot(canonicalRoot, file.path)) {
    throw new Error("The file is outside the approved folders.");
  }

  const relativePath = path.relative(canonicalRoot, file.path);
  const resolved = await resolveFilePath(roots, file.rootId, relativePath);
  if (!unchangedSinceScan(file, resolved.stats)) {
    throw new Error("The file changed after scanning. Rescan before reviewing it.");
  }

  const handle = await fs.open(resolved.path, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile() || !unchangedSinceScan(file, before)) {
      throw new Error("The file changed after scanning. Rescan before reviewing it.");
    }

    const hash = createHash("sha256");
    const stream = handle.createReadStream({ autoClose: false });
    for await (const chunk of stream) hash.update(chunk);

    const after = await handle.stat();
    if (!unchangedSinceScan(file, after)) {
      throw new Error("The file changed while checking for duplicates.");
    }
    return hash.digest("hex");
  } finally {
    await handle.close();
  }
}

function getOrCreateCandidate(candidateMap, file, root) {
  const key = path.resolve(file.path).toLocaleLowerCase();
  let candidate = candidateMap.get(key);
  if (!candidate) {
    const canonicalRoot = root.canonicalPath;
    candidate = {
      id: randomUUID(),
      fileName: file.name,
      filePath: file.path,
      sourceRootId: file.rootId,
      sourceRelativePath: path.relative(canonicalRoot, file.path),
      rootLabel: root.label,
      sizeBytes: file.sizeBytes,
      modifiedAt: file.modifiedAt,
      reasonTags: [],
      reasons: []
    };
    candidateMap.set(key, candidate);
  }
  return candidate;
}

function addReason(candidate, tag, description) {
  if (candidate.reasonTags.includes(tag)) return;
  candidate.reasonTags.push(tag);
  candidate.reasons.push(description);
}

async function buildDeletionCandidates(roots, files, { now = new Date() } = {}) {
  const canonicalRoots = new Map();
  const issues = [];
  for (const root of roots) {
    try {
      canonicalRoots.set(root.id, await fs.realpath(root.path));
    } catch (error) {
      if (!["ENOENT", "EACCES", "EPERM"].includes(error.code)) throw error;
    }
  }

  const cutoff = oneYearBefore(now);
  const candidates = new Map();
  const sizeGroups = new Map();

  for (const file of files) {
    const root = roots.find((item) => item.id === file.rootId);
    const canonicalRoot = canonicalRoots.get(file.rootId);
    if (!root || !canonicalRoot || !isInsideRoot(canonicalRoot, file.path)) {
      issues.push({
        fileName: file.name,
        filePath: file.path,
        reason: "This file is outside the approved folders and was not reviewed."
      });
      continue;
    }

    if (isOlderThanOneYear(file.modifiedAt, cutoff)) {
      const candidate = getOrCreateCandidate(candidates, file, {
        ...root,
        canonicalPath: canonicalRoot
      });
      addReason(candidate, "old", "Last modified more than one year ago.");
    }

    if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0) continue;
    const sameSize = sizeGroups.get(file.sizeBytes) ?? [];
    sameSize.push(file);
    sizeGroups.set(file.sizeBytes, sameSize);
  }

  for (const sameSize of sizeGroups.values()) {
    if (sameSize.length < 2) continue;
    const hashGroups = new Map();
    for (const file of sameSize) {
      try {
        const hash = await hashFile(roots, file, canonicalRoots);
        const matchingFiles = hashGroups.get(hash) ?? [];
        matchingFiles.push(file);
        hashGroups.set(hash, matchingFiles);
      } catch (error) {
        issues.push({
          fileName: file.name,
          filePath: file.path,
          reason: `Could not check for duplicate content: ${error.message}`
        });
      }
    }

    for (const matchingFiles of hashGroups.values()) {
      if (matchingFiles.length < 2) continue;
      matchingFiles.sort((left, right) =>
        Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt) ||
        left.path.localeCompare(right.path)
      );
      const original = matchingFiles[0];
      const originalRoot = roots.find((root) => root.id === original.rootId);
      for (const duplicate of matchingFiles.slice(1)) {
        const root = roots.find((item) => item.id === duplicate.rootId);
        const candidate = getOrCreateCandidate(candidates, duplicate, {
          ...root,
          canonicalPath: canonicalRoots.get(root.id)
        });
        addReason(
          candidate,
          "duplicate",
          `Exact content also exists as ${original.name} at ${original.path}.`
        );
        candidate.duplicateOf = {
          fileName: original.name,
          filePath: original.path,
          rootLabel: originalRoot.label
        };
      }
    }
  }

  return {
    candidates: [...candidates.values()],
    issues
  };
}

function createDeletionReviewQueue(roots, initialCandidates, trashItem) {
  if (typeof trashItem !== "function") {
    throw new Error("A Recycle Bin operation is required.");
  }
  const pending = new Map(initialCandidates.map((candidate) => [candidate.id, candidate]));

  function getCandidate(candidateId) {
    const candidate = pending.get(candidateId);
    if (!candidate) throw new Error("That deletion candidate is no longer available. Rescan to refresh it.");
    return candidate;
  }

  return {
    list() {
      return [...pending.values()];
    },
    keep(candidateId) {
      const candidate = getCandidate(candidateId);
      pending.delete(candidateId);
      return { fileName: candidate.fileName };
    },
    async delete(candidateId) {
      const candidate = getCandidate(candidateId);
      const file = await resolveFilePath(roots, candidate.sourceRootId, candidate.sourceRelativePath);
      if (!unchangedSinceScan(candidate, file.stats)) {
        throw new Error("The file changed after scanning. Rescan before deleting it.");
      }
      await trashItem(file.path);
      pending.delete(candidateId);
      return { fileName: candidate.fileName };
    }
  };
}

module.exports = {
  buildDeletionCandidates,
  createDeletionReviewQueue,
  isOlderThanOneYear
};
