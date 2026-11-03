import { describe, expect, it } from "bun:test";
import {
  ERROR_DEFINITIONS,
  SUPPORTED_ERROR_CODES,
  resolveErrorConfig,
  type HttpErrorCode,
} from "../../src/features/errors/error-definitions";
import { renderErrorPage } from "../../src/lib/error-page";

describe("Centralized Error Handling System", () => {
  it("defines all required HTTP status codes and offline state", () => {
    const requiredCodes: HttpErrorCode[] = [
      400,
      401,
      403,
      404,
      408,
      409,
      422,
      429,
      500,
      502,
      503,
      504,
      "offline",
    ];
    for (const code of requiredCodes) {
      expect(SUPPORTED_ERROR_CODES).toContain(code);
      const config = ERROR_DEFINITIONS[String(code)];
      expect(config).toBeDefined();
      expect(config?.title).toBeTruthy();
      expect(config?.description).toBeTruthy();
      expect(config?.variant).toBeTruthy();
      expect(config?.primaryAction?.label).toBeTruthy();
    }
  });

  it("resolves error codes from numbers and strings", () => {
    expect(resolveErrorConfig(404).code).toBe(404);
    expect(resolveErrorConfig("404").code).toBe(404);
    expect(resolveErrorConfig(500).code).toBe(500);
    expect(resolveErrorConfig("503").code).toBe(503);
    expect(resolveErrorConfig(403).variant).toBe("forbidden");
    expect(resolveErrorConfig(401).variant).toBe("unauthorized");
  });

  it("resolves error config from response/error objects", () => {
    const errorObj = { status: 429, message: "Too many requests" };
    expect(resolveErrorConfig(errorObj).code).toBe(429);

    const networkError = new Error("Failed to fetch");
    expect(resolveErrorConfig(networkError).variant).toBe("offline");

    const timeoutError = new Error("Request timeout after 10000ms");
    expect(resolveErrorConfig(timeoutError).code).toBe(408);
  });

  it("defaults unknown errors gracefully without exposing sensitive internals", () => {
    const unknown = resolveErrorConfig(999);
    expect(unknown.title).toBe("Something Went Wrong");
    expect(unknown.description).not.toContain("stack");
  });

  it("renders standalone SSR fallback HTML with theme styling and SVG elements", () => {
    const html = renderErrorPage(500, "Internal Server Error", "Something went wrong.");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("500");
    expect(html).toContain("Internal Server Error");
    expect(html).toContain("#ef5b78");
    expect(html).toContain("<svg");
    expect(html).toContain("Contact Support");
    expect(html).toContain("Try Again");
    expect(html).toContain("Go Home");
  });
});
