/**
 * @deprecated This modal component has been deprecated and unified into the canonical full-page
 * AddDecorationPage wizard (`src/components/company/add-decoration-page.tsx`).
 *
 * All entry points now route to `/add-decoration` which provides the unified 3-step wizard
 * (Upload Photo -> Basic Details -> Setup Details) with all merged field logic (Dimensions,
 * Floral Style toggle, Starting Price, Description, and Setup Summary panel).
 */

export { AddDecorationPage as AddDecorationSetupWizard } from "./add-decoration-page";
export type { AddDecorationPageProps as AddDecorationSetupWizardProps } from "./add-decoration-page";
