export type HttpErrorCode =
  400 | 401 | 403 | 404 | 408 | 409 | 422 | 429 | 500 | 502 | 503 | 504 | "offline" | "unknown";

export type IllustrationVariant =
  | "notFound"
  | "forbidden"
  | "unauthorized"
  | "timeout"
  | "server"
  | "rateLimit"
  | "conflict"
  | "badRequest"
  | "offline"
  | "generic";

export interface ErrorConfig {
  code: string | number;
  badge: string;
  title: string;
  description: string;
  variant: IllustrationVariant;
  primaryAction: {
    label: string;
    type: "retry" | "home" | "back" | "support" | "login";
  };
  secondaryAction?: {
    label: string;
    type: "retry" | "home" | "back" | "support" | "login";
  };
}

export const SUPPORTED_ERROR_CODES: Array<HttpErrorCode> = [
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

export const ERROR_DEFINITIONS: Record<string, ErrorConfig> = {
  "400": {
    code: 400,
    badge: "Invalid Request",
    title: "Bad Request",
    description:
      "The server could not understand your request. The URL may be malformed or required parameters were missing.",
    variant: "badRequest",
    primaryAction: { label: "Go Home", type: "home" },
    secondaryAction: { label: "Go Back", type: "back" },
  },
  "401": {
    code: 401,
    badge: "Authentication Required",
    title: "Please Sign In",
    description:
      "You need to sign in with an authorized account to access this page or manage decorations.",
    variant: "unauthorized",
    primaryAction: { label: "Go Home", type: "home" },
    secondaryAction: { label: "Contact Support", type: "support" },
  },
  "403": {
    code: 403,
    badge: "Restricted Access",
    title: "Access Forbidden",
    description:
      "You do not have permission to view this resource. If you believe this is an error, please reach out to support.",
    variant: "forbidden",
    primaryAction: { label: "Go Home", type: "home" },
    secondaryAction: { label: "Contact Support", type: "support" },
  },
  "404": {
    code: 404,
    badge: "Missing Page",
    title: "Page Not Found",
    description:
      "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
    variant: "notFound",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  "408": {
    code: 408,
    badge: "Connection Timed Out",
    title: "Request Timeout",
    description:
      "The server took too long to complete the request. Please check your internet connection and try refreshing.",
    variant: "timeout",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  "409": {
    code: 409,
    badge: "Conflict Detected",
    title: "Resource Conflict",
    description:
      "The requested change conflicts with existing data in the system. Please reload the latest state and try again.",
    variant: "conflict",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Back", type: "back" },
  },
  "422": {
    code: 422,
    badge: "Validation Error",
    title: "Unprocessable Request",
    description:
      "The data you submitted contained validation errors or missing requirements and could not be processed.",
    variant: "badRequest",
    primaryAction: { label: "Go Back", type: "back" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  "429": {
    code: 429,
    badge: "Rate Limit Exceeded",
    title: "Too Many Requests",
    description:
      "You have submitted too many requests in a short time. Please wait a brief moment before trying again.",
    variant: "rateLimit",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  "500": {
    code: 500,
    badge: "Server Error",
    title: "Internal Server Error",
    description:
      "Something went wrong on our server while loading this page. Our technical team has been notified.",
    variant: "server",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  "502": {
    code: 502,
    badge: "Gateway Error",
    title: "Bad Gateway",
    description:
      "The server received an invalid or incomplete response from an upstream server. Please try again shortly.",
    variant: "server",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  "503": {
    code: 503,
    badge: "Maintenance Notice",
    title: "Service Unavailable",
    description:
      "We are currently performing routine maintenance or experiencing heavy traffic. We will be right back.",
    variant: "server",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  "504": {
    code: 504,
    badge: "Gateway Timeout",
    title: "Gateway Timeout",
    description:
      "The upstream server did not respond in time to fulfill your request. Please check back in a moment.",
    variant: "timeout",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  offline: {
    code: "OFFLINE",
    badge: "Connection Lost",
    title: "No Internet Connection",
    description:
      "You appear to be offline. Please verify your Wi-Fi or mobile network connection and try again.",
    variant: "offline",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
  unknown: {
    code: "ERROR",
    badge: "Unexpected Error",
    title: "Something Went Wrong",
    description:
      "An unexpected application error occurred. You can try refreshing the page or navigating back to safety.",
    variant: "generic",
    primaryAction: { label: "Try Again", type: "retry" },
    secondaryAction: { label: "Go Home", type: "home" },
  },
};

export function resolveErrorConfig(
  input?: HttpErrorCode | number | string | Error | null,
): ErrorConfig {
  if (typeof window !== "undefined" && !window.navigator.onLine) {
    return ERROR_DEFINITIONS["offline"]!;
  }

  if (typeof input === "number" || typeof input === "string") {
    const key = String(input).trim().toLowerCase();
    if (ERROR_DEFINITIONS[key]) {
      return ERROR_DEFINITIONS[key]!;
    }
  }

  if (input && typeof input === "object") {
    const errorObj = input as { status?: unknown; statusCode?: unknown; message?: unknown };
    const rawStatus = errorObj.status ?? errorObj.statusCode;
    if (typeof rawStatus === "number" || typeof rawStatus === "string") {
      const key = String(rawStatus);
      if (ERROR_DEFINITIONS[key]) {
        return ERROR_DEFINITIONS[key]!;
      }
    }

    const msg = String(errorObj.message || "").toLowerCase();
    if (msg.includes("network") || msg.includes("offline") || msg.includes("failed to fetch")) {
      return ERROR_DEFINITIONS["offline"]!;
    }
    if (msg.includes("timeout")) {
      return ERROR_DEFINITIONS["408"]!;
    }
    if (msg.includes("not found") || msg.includes("404")) {
      return ERROR_DEFINITIONS["404"]!;
    }
    if (msg.includes("forbidden") || msg.includes("403")) {
      return ERROR_DEFINITIONS["403"]!;
    }
    if (msg.includes("unauthorized") || msg.includes("401")) {
      return ERROR_DEFINITIONS["401"]!;
    }
  }

  return ERROR_DEFINITIONS["unknown"]!;
}
