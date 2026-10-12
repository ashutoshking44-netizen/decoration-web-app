import fs from "node:fs";

// Load db.json
const dbRaw = fs.readFileSync("c:\\Users\\ashut\\Downloads\\Decoration web app\\decoration-dashboard\\server\\data\\db.json", "utf8");
const db = JSON.parse(dbRaw);

console.log("=== VERIFYING SERVER DB ===");
const ramThapa = db.enquiries.find(e => e.id === "enq-ram-thapa" || e.name?.toLowerCase().includes("ram thapa"));
if (!ramThapa) {
  console.error("FAIL: ram thapa enquiry not found in db.json!");
  process.exit(1);
}
console.log("Found enquiry:", ramThapa.id, ramThapa.name);

const pickedItem = ramThapa.events[0]?.requested_decorations?.[0];
if (!pickedItem) {
  console.error("FAIL: no requested_decoration in ram thapa event 0!");
  process.exit(1);
}
console.log("Picked item:", pickedItem);

const grandRoyalInDb = db.decorations.find(d => d.id === "dummy-royal-orchid-stage" || d.id === "9101");
console.log("Grand Royal Stage in DB:", grandRoyalInDb ? "Found (" + grandRoyalInDb.name + ")" : "NOT FOUND");

console.log("\n=== CHECKING REQUIRED FIELDS ===");
console.log("inclusions:", pickedItem.inclusions);
console.log("style:", pickedItem.style);
console.log("colours:", pickedItem.colours);
console.log("dimensions:", pickedItem.dimensions || pickedItem.size);
console.log("priceUnit:", pickedItem.priceUnit);
console.log("ownerCompanyName:", pickedItem.companyName || pickedItem.ownerCompanyName);

if (!pickedItem.inclusions || pickedItem.inclusions.length === 0) {
  console.error("FAIL: inclusions missing!");
  process.exit(1);
}
if (!pickedItem.style) {
  console.error("FAIL: style missing!");
  process.exit(1);
}
if (!pickedItem.colours) {
  console.error("FAIL: colours missing!");
  process.exit(1);
}
if (!pickedItem.dimensions && !pickedItem.size) {
  console.error("FAIL: dimensions/size missing!");
  process.exit(1);
}
if (!pickedItem.priceUnit) {
  console.error("FAIL: priceUnit missing!");
  process.exit(1);
}

console.log("\nALL VERIFICATION CHECKS PASSED!");
