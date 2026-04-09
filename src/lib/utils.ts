import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Sanitises a value to prevent CSV formula injection by prefixing dangerous
 * characters (=, +, -, @, tab, carriage return) with a single quote.
 * @param value The string value to sanitise
 * @returns The sanitised string
 */
function sanitiseCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Converts an array of objects to a CSV string.
 * @param data Array of objects to convert
 * @returns CSV string
 */
export function convertToCSV(data: (Record<string, unknown> | null)[]): string {
  if (!Array.isArray(data) || data.length === 0) return "";

  // Find the first non-null/undefined object to get headers
  const firstValidObject = data.find((item) => item !== null && typeof item === "object");
  if (!firstValidObject) return "";

  const headers = Object.keys(firstValidObject);

  const escapeValue = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const strVal = typeof val === "string" ? sanitiseCsvCell(val) : String(val);
    if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
      return `"${strVal.replace(/"/g, '""')}"`;
    }
    return strVal;
  };

  const headerRow = headers.map(escapeValue).join(",");
  const rows = data.map((obj) =>
    headers
      .map((header) => {
        const val = obj ? obj[header] : "";
        return escapeValue(val);
      })
      .join(",")
  );

  return [headerRow, ...rows].join("\n");
}

/**
 * Triggers a browser download of a CSV string.
 * @param csv CSV content string
 * @param filename Desired filename
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
