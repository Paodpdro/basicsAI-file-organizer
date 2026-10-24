function formatModifiedDate(modifiedAt) {
  if (typeof modifiedAt !== "string" || modifiedAt.trim() === "") return "Unknown";
  const date = new Date(modifiedAt);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatModifiedDate };
}
