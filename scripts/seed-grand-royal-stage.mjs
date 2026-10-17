import fs from "node:fs";

const dbPath = "server/data/db.json";
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

// 1. Add Grand Royal Stage to decorations if not already present
const stageId = "dummy-royal-orchid-stage";
const existingStage = db.decorations.find(
  (d) => d.id === stageId || d.id === "9101" || d.name === "Grand Royal Stage",
);

const grandRoyalStage = {
  id: "dummy-royal-orchid-stage",
  sku: "STG-ROYAL-9101",
  aliases: ["9101", "dummy-royal-orchid-stage", "grand-royal-stage", "dec-c2-grand-royal-stage"],
  name: "Grand Royal Stage",
  category: "Stage",
  description:
    "Grand Roman Pillar Arch with Royal Orchid & Lily Cascades. Dimensions: 24 × 14 ft. Platform: Red Carpet Royal Stage.",
  status: "Live",
  price: 75000,
  images: [
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
  ],
  events: ["Wedding", "Reception", "Engagement", "Sangeet"],
  structure: "Grand Roman Pillar Arch",
  dimensions: "24 × 14 ft",
  flowers: "Royal Orchid & Lily Cascades",
  platform: "Red Carpet Royal Stage (24 × 12 ft)",
  floral: {
    style: "Royal Orchid & Lily Cascades",
    varietyType: "Natural / Fresh",
    flowers: [
      { name: "Orchid", kind: "Fresh", colour: "Magenta & White" },
      { name: "Asiatic Lily", kind: "Fresh", colour: "Ivory White" },
      { name: "Dutch Rose", kind: "Fresh", colour: "Blush Pink" },
    ],
  },
  addons: [
    {
      title: "Maharani Thrones (Pair)",
      sub: "Gold-carved royal chairs with velvet cushions",
      price: 8000,
    },
  ],
  inclusions: [
    "Grand Roman Pillar Arch Framework (24 × 14 ft)",
    "Royal Orchid & Lily Cascading Fresh Floral Wall",
    "Red Carpet Royal Stage Platform (24 × 12 ft)",
    "6 Warm Crystal Chandeliers & Focused LED Spotlights",
    "Pair of Maharani Gold-carved Royal Throne Chairs",
  ],
  styles: ["Royal", "Traditional", "Modern"],
  colors: ["Pink", "Red", "White", "Gold"],
  priceUnit: "per setup",
  vendor: "Royal Orchid Events",
  companyId: "company-2",
  companyName: "Royal Orchid Events",
  updatedAt: new Date().toISOString(),
};

if (!existingStage) {
  db.decorations.push(grandRoyalStage);
  console.log("Added Grand Royal Stage to db.decorations");
} else {
  Object.assign(existingStage, grandRoyalStage);
  console.log("Updated Grand Royal Stage in db.decorations");
}

// 2. Add Ram Thapa enquiry with Grand Royal Stage if not already present
const ramEnquiryId = "enq-ram-thapa";
const existingRam = db.enquiries.find(
  (e) => e.id === ramEnquiryId || (e.name && e.name.toLowerCase() === "ram thapa"),
);

const ramEnquiry = {
  id: "enq-ram-thapa",
  createdAt: new Date().toISOString(),
  type: "quotation-request",
  name: "Ram Thapa",
  phone: "9841998877",
  email: "ram.thapa@example.com",
  message: "Quotation request for Grand Royal Stage setup",
  venue: "Godavari Banquet, Lalitpur",
  events: [
    {
      name: "Wedding Reception",
      date: "2026-11-25",
      venue: "Godavari Banquet, Lalitpur",
      decorations: [
        {
          id: "dummy-royal-orchid-stage",
          decorationId: "dummy-royal-orchid-stage",
          name: "Grand Royal Stage",
          title: "Grand Royal Stage",
          category: "Stage",
          price: 75000,
          listedPrice: 75000,
          priceUnit: "per setup",
          image:
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
          photo:
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
          ],
          companyId: "company-2",
          companyName: "Royal Orchid Events",
          ownerCompanyId: "company-2",
          ownerCompanyName: "Royal Orchid Events",
          description:
            "Grand Roman Pillar Arch with Royal Orchid & Lily Cascades. Dimensions: 24 × 14 ft. Platform: Red Carpet Royal Stage.",
          inclusions: [
            "Grand Roman Pillar Arch Framework (24 × 14 ft)",
            "Royal Orchid & Lily Cascading Fresh Floral Wall",
            "Red Carpet Royal Stage Platform (24 × 12 ft)",
            "6 Warm Crystal Chandeliers & Focused LED Spotlights",
            "Pair of Maharani Gold-carved Royal Throne Chairs",
          ],
          style: "Royal, Traditional, Modern",
          colours: "Pink, Red, White, Gold",
          size: "24 × 14 ft",
          dimensions: "24 × 14 ft",
          structure: "Grand Roman Pillar Arch",
          platform: "Red Carpet Royal Stage (24 × 12 ft)",
          lighting: "Warm Crystal Chandeliers & Spotlights (6 units)",
          flowers: "Royal Orchid & Lily Cascades",
        },
      ],
      subtotal: 75000,
    },
  ],
  grandTotal: 75000,
};

// Ensure both decorations and requested_decorations are populated on events
ramEnquiry.events.forEach((ev) => {
  ev.requested_decorations = ev.decorations;
});

if (!existingRam) {
  db.enquiries.unshift(ramEnquiry);
  console.log("Added Ram Thapa enquiry to db.enquiries");
} else {
  Object.assign(existingRam, ramEnquiry);
  console.log("Updated Ram Thapa enquiry in db.enquiries");
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
console.log("Successfully persisted db.json with Grand Royal Stage and Ram Thapa enquiry!");
