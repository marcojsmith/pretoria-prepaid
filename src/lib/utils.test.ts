import { describe, it, expect, vi, afterEach } from "vitest";
import { cn, convertToCSV, downloadCSV } from "./utils";

describe("cn utility", () => {
  // ... existing tests ...
  it("handles undefined and null", () => {
    expect(cn("px-2", undefined, null)).toBe("px-2");
  });
});

describe("CSV utilities", () => {
  const data = [
    { name: "John", age: 30, city: "New York" },
    { name: "Jane", age: 25, city: "London" },
  ];

  const origCreateObjectURL = global.URL.createObjectURL;
  const origRevokeObjectURL = global.URL.revokeObjectURL;

  afterEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = origCreateObjectURL;
    global.URL.revokeObjectURL = origRevokeObjectURL;
  });

  it("converts array of objects to CSV string", () => {
    const csv = convertToCSV(data);
    expect(csv).toBe("name,age,city\nJohn,30,New York\nJane,25,London");
  });

  it("handles empty data", () => {
    expect(convertToCSV([])).toBe("");
  });

  it("triggers download", () => {
    // Mock DOM elements and methods
    const mockElement = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document, "createElement").mockReturnValue(mockElement as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockElement as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockElement as any);

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => "blob:url");
    global.URL.revokeObjectURL = vi.fn();

    downloadCSV("col1,col2\nval1,val2", "test.csv");

    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(mockElement.setAttribute).toHaveBeenCalledWith("href", "blob:url");
    expect(mockElement.setAttribute).toHaveBeenCalledWith("download", "test.csv");
    expect(mockElement.click).toHaveBeenCalled();
  });
});
