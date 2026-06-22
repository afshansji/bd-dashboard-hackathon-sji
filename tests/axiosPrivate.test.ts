import { describe, expect, test } from "bun:test";
import { createUrlBuilder } from "../src/lib/axiosPrivate";

describe("createUrlBuilder", () => {
  test("builds admin campaigns url without duplicating slashes when base url has trailing slash", () => {
    const buildUrl = createUrlBuilder("https://example.supabase.co/");
    expect(buildUrl("/admin-campaigns/list")).toBe(
      "https://example.supabase.co/functions/v1/admin-campaigns/list",
    );
  });

  test("builds admin campaigns url without duplicating slashes when base url lacks trailing slash", () => {
    const buildUrl = createUrlBuilder("https://example.supabase.co");
    expect(buildUrl("/admin-campaigns/list")).toBe(
      "https://example.supabase.co/functions/v1/admin-campaigns/list",
    );
  });

  test("trims whitespace and extra slashes from the Supabase URL", () => {
    const buildUrl = createUrlBuilder(" https://example.supabase.co/// ");
    expect(buildUrl("admin-campaigns/list")).toBe(
      "https://example.supabase.co/functions/v1/admin-campaigns/list",
    );
  });

  test("appends query parameters without duplicating separators", () => {
    const buildUrl = createUrlBuilder("https://example.supabase.co");
    expect(
      buildUrl("/admin-campaigns/list", { status: "active", page: 2 }),
    ).toBe(
      "https://example.supabase.co/functions/v1/admin-campaigns/list?status=active&page=2",
    );
  });
});
