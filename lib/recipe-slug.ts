export function recipeNameToSlug(name: string): string {
    const input = (name ?? "").toString().trim().toLowerCase();
    if (!input) return "";
    const german = input
        .replace(/\u00e4/g, "ae")
        .replace(/\u00f6/g, "oe")
        .replace(/\u00fc/g, "ue")
        .replace(/\u00df/g, "ss");
    return german
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/--+/g, "-");
}
