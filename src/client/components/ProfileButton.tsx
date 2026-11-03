import React from "react";
import { Link } from "@tanstack/react-router";

/**
 * Where the profile button leads. For now it opens the company picker;
 * switch this to the login route once the real login page exists.
 */
export const PROFILE_ROUTE = "/companies" as const;

interface ProfileButtonProps {
  /** "icon": round icon button (mobile header). "pill": icon + label (desktop). */
  variant?: "icon" | "pill";
  className?: string;
}

const UserIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

/** Profile / account entry point (opens the companies page for now). */
export const ProfileButton: React.FC<ProfileButtonProps> = ({
  variant = "icon",
  className = "",
}) => (
  <Link
    to={PROFILE_ROUTE}
    className={`profile-btn profile-btn--${variant} ${className}`.trim()}
    aria-label="Profile"
    title="Profile"
  >
    <UserIcon />
    {variant === "pill" && <span className="profile-btn-label">Profile</span>}
  </Link>
);

export default ProfileButton;
