/**
 * The Vault - Data Store
 * Add entries here. index.html renders them automatically.
 *
 * Schema:
 * {
 *   id: unique string (kebab-case),
 *   title: string,
 *   type: "code" | "quote",
 *   language: string (for code: javascript, python, css, html, etc. | for quotes: "quote"),
 *   category: string,
 *   description: string,
 *   tags: string[],
 *   content: string (the code or quote text),
 *   author: string (optional, for quotes)
 * }
 */

const SNIPPETS = [
  {
    id: "honor-over-fraud",
    title: "Honor Over Fraud",
    type: "quote",
    language: "quote",
    category: "Wisdom",
    description: "A principle on integrity and living with character.",
    tags: ["honor", "integrity", "character"],
    content: "You'd better die with honor than live with fraud.",
    author: "Unknown"
  },
  {
    id: "loyalty-two-way",
    title: "Loyalty is a Two-Way Street",
    type: "quote",
    language: "quote",
    category: "Wisdom",
    description: "On mutual respect and reciprocal allegiance.",
    tags: ["loyalty", "respect", "relationships"],
    content: "Loyalty is a two way street. If I'm asking for it from you, then you're getting it from me.",
    author: "Harvey Specter"
  }
];

if (typeof window !== "undefined") {
  window.SNIPPETS = SNIPPETS;
}
