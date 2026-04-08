import { describe, it, expect, vi, afterEach } from "vitest";
import { cn, convertToCSV, downloadCSV } from "./utils";

describe("cn utility", () => {
  it("handles undefined and null", () => {
    expect(cn("px-2", undefined, null)).toBe("px-2");
  });
});

describe("CSV utilities", () => {
  const data = [
    { name: "John", age: 30, city: "New York" },
    { name: "Jane", age: 25, city: "London" },
  ];

  const origCreateObjectURL = globalThis.URL?.createObjectURL?.bind(globalThis.URL);
  const origRevokeObjectURL = globalThis.URL?.revokeObjectURL?.bind(globalThis.URL);

  afterEach(() => {
    vi.restoreAllMocks();
    if (origCreateObjectURL) globalThis.URL.createObjectURL = origCreateObjectURL;
    if (origRevokeObjectURL) globalThis.URL.revokeObjectURL = origRevokeObjectURL;
  });

  it("converts array of objects to CSV string", () => {
    const csv = convertToCSV(data);
    expect(csv).toBe("name,age,city\nJohn,30,New York\nJane,25,London");
  });

  it("handles empty data", () => {
    expect(convertToCSV([])).toBe("");
  });

  it("handles values with commas", () => {
    const data = [{ name: "Hello, World" }];
    const csv = convertToCSV(data);
    expect(csv).toBe('name\n"Hello, World"');
  });

  it("handles values with quotes", () => {
    const data = [{ description: 'He said "hi"' }];
    const csv = convertToCSV(data);
    expect(csv).toBe('description\n"He said ""hi"""');
  });

  it("handles values with newlines", () => {
    const data = [{ note: "line1\nline2" }];
    const csv = convertToCSV(data);
    expect(csv).toBe('note\n"line1\nline2"');
  });

  it("handles null and undefined values", () => {
    const data = [{ name: "John", age: null, city: undefined }];
    const csv = convertToCSV(data);
    expect(csv).toBe("name,age,city\nJohn,,");
  });

  it("returns empty string when all items are null", () => {
    const result = convertToCSV([null, null]);
    expect(result).toBe("");
  });

  it("uses first valid object for headers when array starts with nulls", () => {
    const data: (Record<string, unknown> | null)[] = [null, { name: "Alice", age: 30 }];
    const result = convertToCSV(data);
    expect(result).toContain("name,age");
    expect(result).toContain("Alice");
  });

  it("handles null objects mixed in data rows", () => {
    const data: (Record<string, unknown> | null)[] = [{ name: "Alice" }, null, { name: "Bob" }];
    const result = convertToCSV(data);
    expect(result).toContain("Alice");
    const lines = result.split("\n");
    expect(lines).toHaveLength(4); // header + Alice + empty + Bob
  });

  it("triggers download", () => {
    const mockElement = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    };

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(mockElement as unknown as HTMLAnchorElement);

    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockElement as unknown as Node);

    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockElement as unknown as Node);

    URL.createObjectURL = vi.fn(() => "blob:url");
    URL.revokeObjectURL = vi.fn();

    downloadCSV("col1,col2\nval1,val2", "test.csv");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(mockElement.setAttribute).toHaveBeenCalledWith("href", "blob:url");
    expect(mockElement.setAttribute).toHaveBeenCalledWith("download", "test.csv");
    expect(mockElement.click).toHaveBeenCalled();
  });
});
