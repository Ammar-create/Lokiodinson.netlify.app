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
 *   content: string (the code or quote text)
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
    content: "You'd better die with honor than live with fraud."
  }
];

if (typeof window !== "undefined") {
  window.SNIPPETS = SNIPPETS;
}
