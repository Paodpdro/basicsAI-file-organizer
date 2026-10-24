const MAX_SEARCH_RESULTS = 100;

function searchFileRecords(files, query) {
  if (typeof query !== "string") throw new Error("Enter a word or part of a file path to search.");
  const term = query.trim().toLowerCase();
  if (!term) return { results: [], total: 0 };

  const matches = files
    .filter((file) => `${file.name}\n${file.path}`.toLowerCase().includes(term))
    .sort((left, right) => left.name.localeCompare(right.name));
  return { results: matches.slice(0, MAX_SEARCH_RESULTS), total: matches.length };
}

module.exports = { MAX_SEARCH_RESULTS, searchFileRecords };
