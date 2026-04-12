import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { SEO } from "./SEO";

function renderSEO(props: Parameters<typeof SEO>[0] = {}) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>
  );
}

describe("SEO", () => {
  it("renders with title", () => {
    renderSEO({ title: "Home" });
    expect(document.title).toBe("Home | Pretoria Prepaid");
  });

  it("renders without title (uses site title)", () => {
    renderSEO({});
    expect(document.title).toBe("Pretoria Prepaid");
  });

  it("uses default description when none provided", () => {
    renderSEO({});
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute("content")).toContain("prepaid electricity");
  });

  it("uses custom description when provided", () => {
    renderSEO({ description: "Custom desc" });
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute("content")).toBe("Custom desc");
  });

  it("renders canonical link when provided", () => {
    renderSEO({ canonical: "https://example.com/page" });
    const link = document.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute("href")).toBe("https://example.com/page");
  });

  it("does not render canonical link when not provided", () => {
    renderSEO({});
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).toBeNull();
  });

  it("renders noindex meta when noindex=true", () => {
    renderSEO({ noindex: true });
    const meta = document.querySelector('meta[name="robots"]');
    expect(meta?.getAttribute("content")).toBe("noindex, nofollow");
  });

  it("does not render noindex meta when noindex=false", () => {
    renderSEO({ noindex: false });
    const meta = document.querySelector('meta[name="robots"]');
    expect(meta).toBeNull();
  });

  it("uses propUrl when provided", () => {
    renderSEO({ url: "https://example.com/custom" });
    const meta = document.querySelector('meta[property="og:url"]');
    expect(meta?.getAttribute("content")).toBe("https://example.com/custom");
  });
});
