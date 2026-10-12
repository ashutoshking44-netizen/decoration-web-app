// scripts/test-proposal-layout-order.mjs
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("=== Testing Quotation Layout Order ===");

const filePath = path.resolve("./src/components/company/decoration-proposal-view.tsx");
const content = fs.readFileSync(filePath, "utf-8");

// 1. Check relative positions of key sections in source code
const eventScheduleIdx = content.indexOf('EVENT SCHEDULE');
const whatWeWillBuildIdx = content.indexOf('WHAT WE WILL BUILD');
const totalQuotationIdx = content.indexOf('TOTAL QUOTATION');
const findUsOnlineIdx = content.indexOf('FIND US ONLINE');

assert(eventScheduleIdx !== -1, "EVENT SCHEDULE section should exist");
assert(whatWeWillBuildIdx !== -1, "WHAT WE WILL BUILD section should exist");
assert(totalQuotationIdx !== -1, "TOTAL QUOTATION section should exist");
assert(findUsOnlineIdx !== -1, "FIND US ONLINE section should exist");

console.log(`Positions:
- EVENT SCHEDULE: ${eventScheduleIdx}
- WHAT WE WILL BUILD: ${whatWeWillBuildIdx}
- TOTAL QUOTATION: ${totalQuotationIdx}
- FIND US ONLINE: ${findUsOnlineIdx}`);

assert(eventScheduleIdx < whatWeWillBuildIdx, "EVENT SCHEDULE must be before WHAT WE WILL BUILD");
assert(whatWeWillBuildIdx < totalQuotationIdx, "WHAT WE WILL BUILD must be before TOTAL QUOTATION");
assert(totalQuotationIdx < findUsOnlineIdx, "TOTAL QUOTATION must be before FIND US ONLINE");
console.log("✓ Layout order verified: Event schedule -> Décor sections -> Total quotation -> Find us online");

// 2. Check that everything inside Total quotation is together and in exact required order:
// amount -> package description -> payment schedule (40/40/20) -> terms & conditions button
const totalBlock = content.slice(totalQuotationIdx, findUsOnlineIdx);

const bignumIdx = totalBlock.indexOf("dp-bignum");
const subnumIdx = totalBlock.indexOf("dp-subnum");
const blurbIdx = totalBlock.indexOf("dp-blurb");
const scheduleIdx = totalBlock.indexOf("dp-schedule");
const tcBtnIdx = totalBlock.indexOf("dp-tcbtn");

assert(bignumIdx !== -1, "Total amount (dp-bignum) must be present in Total quotation block");
assert(subnumIdx !== -1, "Package description (dp-subnum) must be present in Total quotation block");
assert(blurbIdx !== -1, "Package blurb (dp-blurb) must be present in Total quotation block");
assert(scheduleIdx !== -1, "Payment schedule (dp-schedule) must be present in Total quotation block");
assert(tcBtnIdx !== -1, "Terms & conditions button (dp-tcbtn) must be present in Total quotation block");

assert(bignumIdx < subnumIdx, "Amount must come before package description");
assert(subnumIdx < scheduleIdx, "Package description must come before payment schedule");
assert(scheduleIdx < tcBtnIdx, "Payment schedule must come before terms & conditions button");
console.log("✓ Total quotation block order verified: amount -> package description -> payment schedule -> terms & conditions button");

// 3. Verify that Find us online section is wrapped with socialLinks check
const findUsOnlineBlock = content.slice(findUsOnlineIdx - 200, findUsOnlineIdx + 500);
assert(findUsOnlineBlock.includes("socialLinks.length > 0"), "Find us online must be hidden when company has no social links");
console.log("✓ Find us online condition verified: hidden when no social links saved");

// 4. Verify shared component usage across preview modal and public route
const previewModalContent = fs.readFileSync(path.resolve("./src/components/company/proposal-preview-modal.tsx"), "utf-8");
const publicRouteContent = fs.readFileSync(path.resolve("./src/routes/proposal.$proposalId.tsx"), "utf-8");

assert(previewModalContent.includes("<DecorationProposalView"), "Proposal preview modal uses DecorationProposalView");
assert(publicRouteContent.includes("<DecorationProposalView"), "Public proposal route uses DecorationProposalView");
console.log("✓ Shared component verified across Phone preview, Desktop preview, and public page");

console.log("=== ALL LAYOUT ORDER TESTS PASSED SUCCESSFULLY! ===");
