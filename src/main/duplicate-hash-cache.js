const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const path = require("node:path");

const CACHE_VERSION = 1;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function cacheKey(filePath) {
  return path.resolve(filePath);
}

function sameMetadata(entry, file) {
  return entry.sizeBytes === file.sizeBytes && entry.modifiedAt === file.modifiedAt;
}

async function createDuplicateHashCache(cachePath, scannedFiles) {
  let cachedEntries = [];
  try {
    const contents = await fs.readFile(cachePath, "utf8");
    const cache = JSON.parse(contents);
    if (cache.version !== CACHE_VERSION || !Array.isArray(cache.entries)) {
      throw new Error("The duplicate hash cache has an unsupported format.");
    }
    cachedEntries = cache.entries;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error(`Could not read the duplicate hash cache: ${error.message}`);
    }
  }

  const filesByPath = new Map(scannedFiles.map((file) => [cacheKey(file.path), file]));
  const entries = new Map();
  for (const entry of cachedEntries) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      !Number.isSafeInteger(entry.sizeBytes) ||
      entry.sizeBytes < 0 ||
      typeof entry.modifiedAt !== "string" ||
      !Number.isFinite(Date.parse(entry.modifiedAt)) ||
      typeof entry.sha256 !== "string" ||
      !SHA256_PATTERN.test(entry.sha256)
    ) {
      throw new Error("Could not read the duplicate hash cache: an entry is invalid.");
    }

    const file = filesByPath.get(cacheKey(entry.path));
    if (file && sameMetadata(entry, file)) {
      entries.set(cacheKey(entry.path), { ...entry, path: cacheKey(entry.path) });
    }
  }

  let dirty = entries.size !== cachedEntries.length;
  return {
    get(file) {
      const key = cacheKey(file.path);
      const entry = entries.get(key);
      if (!entry) return null;
      if (!sameMetadata(entry, file)) {
        entries.delete(key);
        dirty = true;
        return null;
      }
      return entry.sha256;
    },
    set(file, sha256) {
      if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
        throw new Error("A valid SHA-256 digest is required for the duplicate hash cache.");
      }
      const key = cacheKey(file.path);
      entries.set(key, {
        path: key,
        sizeBytes: file.sizeBytes,
        modifiedAt: file.modifiedAt,
        sha256
      });
      dirty = true;
    },
    async flush() {
      if (!dirty) return;
      const temporaryPath = `${cachePath}.${randomUUID()}.tmp`;
      try {
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(temporaryPath, JSON.stringify({
          version: CACHE_VERSION,
          entries: [...entries.values()]
        }), { encoding: "utf8", flag: "w" });
        await fs.rename(temporaryPath, cachePath);
        dirty = false;
      } catch (error) {
        throw new Error(`Could not save the duplicate hash cache: ${error.message}`);
      } finally {
        await fs.rm(temporaryPath, { force: true });
      }
    }
  };
}

module.exports = { createDuplicateHashCache };
