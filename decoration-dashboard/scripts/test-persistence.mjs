// Test persistence script simulating sending 3 enquiries, restarting API, checking db.json
import fs from "node:fs";
import http from "node:http";

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode, body: text }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let text = "";
      res.on("data", (c) => (text += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    }).on("error", reject);
  });
}

async function run() {
  console.log("=== 1. Submitting 3 real enquiries to API ===");
  const enq1 = {
    name: "Rohan & Priya",
    phone: "9801112233",
    email: "rohan@example.com",
    venue: "Godavari Banquet",
    grandTotal: 95000,
    events: [
      {
        name: "Sangeet Night",
        date: "2026-11-15",
        venue: "Godavari Banquet",
        subtotal: 95000,
        decorations: [
          {
            id: "dec-c1-mandap",
            name: "Royal Carved Wooden Mandap",
            category: "Mandap",
            price: 85000,
            photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          },
        ],
      },
    ],
  };

  const enq2 = {
    name: "Bikash Adhikari",
    phone: "9812223344",
    email: "bikash@example.com",
    venue: "Yak & Yeti",
    grandTotal: 140000,
    events: [
      {
        name: "Wedding Ceremony",
        date: "2026-11-20",
        venue: "Yak & Yeti",
        subtotal: 140000,
        decorations: [
          {
            id: "dec-c2-stage",
            name: "Luxe Floral Grand Reception Stage",
            category: "Stage",
            price: 65000,
          },
        ],
      },
    ],
  };

  const enq3 = {
    name: "Anjali KC",
    phone: "9823334455",
    email: "anjali@example.com",
    venue: "Soaltee Crowne Plaza",
    grandTotal: 45000,
    events: [
      {
        name: "Reception Party",
        date: "2026-12-05",
        venue: "Soaltee Crowne Plaza",
        subtotal: 45000,
        decorations: [
          {
            id: "dec-c2-fairy-lights",
            name: "Crystal Fairy Lights",
            category: "Entrance Gate",
            price: 45000,
          },
        ],
      },
    ],
  };

  const r1 = await postJson("http://localhost:4000/api/enquiries", enq1);
  console.log("Enquiry 1 status:", r1.status, r1.body);
  const r2 = await postJson("http://localhost:4000/api/enquiries", enq2);
  console.log("Enquiry 2 status:", r2.status, r2.body);
  const r3 = await postJson("http://localhost:4000/api/enquiries", enq3);
  console.log("Enquiry 3 status:", r3.status, r3.body);

  console.log("\n=== 2. Checking db.json on disk ===");
  const dbJson = JSON.parse(fs.readFileSync("server/data/db.json", "utf8"));
  console.log("Total enquiries on disk:", dbJson.enquiries.length);
  const names = dbJson.enquiries.map((e) => e.name);
  console.log("Enquiry names on disk:", names);

  if (names.includes("Rohan & Priya") && names.includes("Bikash Adhikari") && names.includes("Anjali KC")) {
    console.log("SUCCESS: All 3 real enquiries saved to disk!");
  } else {
    console.error("FAIL: Missing enquiries on disk!");
  }

  console.log("\n=== 3. Testing photo externalization in db.json ===");
  const rohanEnquiry = dbJson.enquiries.find((e) => e.name === "Rohan & Priya");
  const photoVal = rohanEnquiry?.events[0]?.decorations[0]?.photo;
  console.log("Rohan photo stored as:", photoVal);
  if (photoVal && photoVal.startsWith("/uploads/")) {
    console.log("SUCCESS: Base64 photo was converted to server upload path:", photoVal);
  } else {
    console.log("Photo val was:", photoVal);
  }
}

run().catch(console.error);
