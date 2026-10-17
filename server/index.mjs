// Shared API for the Decoration Dashboard (admin) and the client site.
//   - Dashboard publishes its decoration catalogue  → PUT  /api/decorations
//   - Client site reads live decorations            → GET  /api/decorations
//   - Client site sends enquiry / quotation request → POST /api/enquiries
//   - Dashboard pulls new enquiries                 → GET  /api/enquiries
// Zero dependencies (Node built-ins only). Data lives in server/data/.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.API_PORT || 4000);
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const MAX_BODY = 80 * 1024 * 1024;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          decorations: Array.isArray(parsed.decorations) ? parsed.decorations : [],
          enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
        };
      }
    }
  } catch (err) {
    console.error("[API Server] Failed to read db.json, attempting backup restore:", err);
    try {
      const bakFile = DB_FILE + ".bak";
      if (fs.existsSync(bakFile)) {
        const bakRaw = fs.readFileSync(bakFile, "utf8");
        const parsedBak = JSON.parse(bakRaw);
        if (parsedBak && typeof parsedBak === "object") {
          return {
            decorations: Array.isArray(parsedBak.decorations) ? parsedBak.decorations : [],
            enquiries: Array.isArray(parsedBak.enquiries) ? parsedBak.enquiries : [],
          };
        }
      }
    } catch {}
  }
  return { decorations: [], enquiries: [] };
}

/** @type {{ decorations: any[]; enquiries: any[] }} */
let db = loadDb();

function persist() {
  if (!db || typeof db !== "object") return;
  try {
    const tmp = DB_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmp, DB_FILE);
    try {
      fs.copyFileSync(DB_FILE, DB_FILE + ".bak");
    } catch {}
  } catch (err) {
    console.error("[API Server] Failed to persist db.json:", err);
  }
}

const EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/** Turn a data:image URL into a file under /uploads and return its relative URL. */
function saveDataUrl(value) {
  if (typeof value !== "string") return value;
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(value);
  if (!m) return value;
  const ext = EXT[m[1].toLowerCase()] || "jpg";
  const buf = Buffer.from(m[2], "base64");
  const name = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 20) + "." + ext;
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
  return `/uploads/${name}`;
}

/** Recursively replace every data:image string with an uploaded-file URL. */
function externalizeImages(node) {
  if (typeof node === "string") return saveDataUrl(node);
  if (Array.isArray(node)) return node.map(externalizeImages);
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, externalizeImages(v)]));
  }
  return node;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const str = (v, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validate + normalise an enquiry coming from the public client site. */
function normaliseEnquiry(input) {
  const name = str(input?.name, 120);
  const phone = str(input?.phone, 40);
  const whatsappNumber = str(input?.whatsappNumber || input?.whatsapp_number, 40);
  const whatsappSameAsPhone =
    input?.whatsappSameAsPhone !== undefined ? Boolean(input.whatsappSameAsPhone) : true;
  if (!name) throw new Error("Name is required");
  if (!phone) throw new Error("Phone is required");
  const events = (Array.isArray(input?.events) ? input.events : []).slice(0, 20).map((e) => ({
    name: str(e?.name, 80) || "Event",
    date: str(e?.date, 20),
    venue: str(e?.venue, 200),
    decorations: (Array.isArray(e?.decorations) ? e.decorations : []).slice(0, 50).map((d) => {
      const decId = str(String(d?.decorationId || d?.id || ""), 80);
      const catalogItem = db.decorations.find((item) => {
        const iId = String(item.id || "").toLowerCase();
        const dId = decId.toLowerCase();
        if (iId === dId || String(item.decorationId || "").toLowerCase() === dId) return true;
        if (
          Array.isArray(item.aliases) &&
          item.aliases.some((a) => String(a).toLowerCase() === dId)
        )
          return true;
        if (
          (dId === "dec-c2-fairy-lights" && iId === "dec-c2-fairy-lights-entrance") ||
          (dId === "dec-c2-fairy-lights-entrance" && iId === "dec-c2-fairy-lights") ||
          (dId === "crystal-fairy-lights" &&
            (iId === "dec-c2-fairy-lights" || iId === "dec-c2-fairy-lights-entrance")) ||
          (dId === "crystal-fairy-lights-entrance" &&
            (iId === "dec-c2-fairy-lights" || iId === "dec-c2-fairy-lights-entrance"))
        )
          return true;
        if (
          (dId === "dummy-royal-orchid-stage" || dId === "9101" || dId === "grand-royal-stage") &&
          (iId === "dummy-royal-orchid-stage" || iId === "9101" || iId === "grand-royal-stage")
        )
          return true;
        const dName = String(d?.name || d?.title || "").toLowerCase();
        const iName = String(item.name || item.title || "").toLowerCase();
        if (
          dName &&
          iName &&
          (dName === iName ||
            (dName.includes("grand royal stage") && iName.includes("grand royal stage")))
        )
          return true;
        return false;
      });
      let ownerCompanyId = str(
        d?.companyId || d?.ownerCompanyId || catalogItem?.companyId || catalogItem?.ownerCompanyId,
        80,
      );
      if (ownerCompanyId === "comp-1") ownerCompanyId = "company-1";
      if (ownerCompanyId === "comp-2") ownerCompanyId = "company-2";
      if (!ownerCompanyId) ownerCompanyId = "company-1";

      let ownerCompanyName = str(
        d?.companyName ||
          d?.ownerCompanyName ||
          catalogItem?.companyName ||
          catalogItem?.ownerCompanyName,
        120,
      );
      if (!ownerCompanyName) {
        ownerCompanyName =
          ownerCompanyId === "company-1"
            ? "Everest Events & Decor"
            : ownerCompanyId === "company-2"
              ? "Royal Orchid Events"
              : `Company ${ownerCompanyId}`;
      }
      const description = str(d?.description || catalogItem?.description, 2000);
      const title = str(d?.name || d?.title || catalogItem?.name || "Decoration", 200);
      const category = str(d?.category || catalogItem?.category || "Stage", 80);
      const price = Number(d?.listedPrice ?? d?.price ?? catalogItem?.price) || 0;
      let rawImg = d?.photo || d?.image || catalogItem?.imageUrl || "";
      if (typeof rawImg === "string" && rawImg.startsWith("data:image/")) {
        rawImg = saveDataUrl(rawImg);
      }
      const image = /^(https?:\/\/|\/uploads\/)/i.test(rawImg) ? str(rawImg, 1000) : "";

      // Extract rich snapshot fields
      const rawGallery =
        Array.isArray(d?.gallery) && d.gallery.length > 0
          ? d.gallery.map((g) =>
              typeof g === "string" && g.startsWith("data:image/") ? saveDataUrl(g) : g,
            )
          : Array.isArray(catalogItem?.gallery) && catalogItem.gallery.length > 0
            ? catalogItem.gallery
            : image
              ? [image]
              : [];
      const gallery = [
        ...new Set(rawGallery.filter((u) => typeof u === "string" && u.trim().length > 0)),
      ];

      const priceUnit = str(
        d?.priceUnit ||
          d?.price_unit ||
          catalogItem?.priceUnit ||
          catalogItem?.price_unit ||
          catalogItem?.specifications?.price_unit,
        40,
      );

      // Fallback: parse description text if fields are missing
      const parsedDesc = {};
      if (description) {
        const dimMatch =
          /(?:Dimensions|Size):\s*([0-9]+(?:\.[0-9]+)?\s*[×xX*]\s*[0-9]+(?:\.[0-9]+)?\s*(?:ft|feet)?)/i.exec(
            description,
          );
        if (dimMatch) parsedDesc.dimensions = dimMatch[1].trim();

        const platMatch = /Platform:\s*([^.\n]+)/i.exec(description);
        if (platMatch && !/^no\b|^none\b/i.test(platMatch[1].trim()))
          parsedDesc.platform = platMatch[1].trim();

        const lightMatch = /Lighting:\s*([^.\n]+)/i.exec(description);
        if (lightMatch && !/^no\b|^none\b/i.test(lightMatch[1].trim()))
          parsedDesc.lighting = lightMatch[1].trim();

        const floralMatch = /Floral:\s*([^.\n]+)/i.exec(description);
        if (floralMatch && !/^no\b|^none\b/i.test(floralMatch[1].trim()))
          parsedDesc.flowers = floralMatch[1].trim();

        const firstSentence = description.split(/\.|\n/)[0]?.trim();
        if (firstSentence) {
          if (firstSentence.toLowerCase().includes(" with ")) {
            const parts = firstSentence.split(/\s+with\s+/i);
            parsedDesc.structure = parts[0]?.trim();
            if (!parsedDesc.flowers && parts[1]) parsedDesc.flowers = parts[1].trim();
          } else if (
            firstSentence.includes("(") &&
            !firstSentence.toLowerCase().startsWith("dimensions")
          ) {
            const pMatch = /^([^(]+)\(([^)]+)\)/.exec(firstSentence);
            if (pMatch) {
              parsedDesc.structure = pMatch[1].trim();
              parsedDesc.style = pMatch[2].trim();
            } else {
              parsedDesc.structure = firstSentence;
            }
          } else if (
            firstSentence.length < 80 &&
            !firstSentence.toLowerCase().startsWith("dimensions")
          ) {
            parsedDesc.structure = firstSentence;
          }
        }

        const inc = [];
        if (parsedDesc.structure) inc.push(parsedDesc.structure);
        if (parsedDesc.flowers) inc.push(parsedDesc.flowers);
        if (parsedDesc.platform) inc.push(`Platform: ${parsedDesc.platform}`);
        if (parsedDesc.lighting) inc.push(`Lighting: ${parsedDesc.lighting}`);
        if (inc.length > 0) parsedDesc.inclusions = inc;
      }

      // Inclusions (explicit or synthesized from specifications or description)
      let inclusions =
        Array.isArray(d?.inclusions) && d.inclusions.length > 0
          ? d.inclusions
          : Array.isArray(catalogItem?.inclusions) && catalogItem.inclusions.length > 0
            ? catalogItem.inclusions
            : undefined;

      if (!inclusions && catalogItem?.specifications) {
        const specs = catalogItem.specifications;
        const synth = [];
        if (specs.main_structure || specs.structure_type)
          synth.push(`Main Structure: ${specs.main_structure || specs.structure_type}`);
        if (specs.floral_tag === "with_flowers" || specs.flowers_used) {
          if (Array.isArray(specs.flowers) && specs.flowers.length > 0) {
            synth.push(
              `Flowers: ${specs.flowers.map((f) => `${f.name || "Flower"}${f.colour ? ` (${f.colour})` : ""}`).join(", ")}`,
            );
          } else {
            synth.push("Floral arrangement included");
          }
        }
        if (specs.platforms_used || specs.mandap_platform_used) {
          synth.push(
            `Platform: ${specs.platform_shape || "Raised deck"}${specs.platform_colour ? ` (${specs.platform_colour})` : ""}`,
          );
        }
        if (specs.lighting_used) synth.push("Integrated spotlights & lighting");
        if (specs.furniture_used && specs.furniture_details)
          synth.push(`Furniture: ${specs.furniture_details}`);
        if (synth.length > 0) inclusions = synth;
      }
      if (!inclusions && parsedDesc.inclusions) {
        inclusions = parsedDesc.inclusions;
      }

      // Style
      const style = str(
        d?.style ||
          catalogItem?.style ||
          (Array.isArray(catalogItem?.specifications?.setup_styles)
            ? catalogItem.specifications.setup_styles.join(", ")
            : "") ||
          parsedDesc.style ||
          "",
        120,
      );

      // Colours
      const colours = str(
        d?.colours ||
          catalogItem?.colours ||
          (Array.isArray(catalogItem?.specifications?.color_theme)
            ? catalogItem.specifications.color_theme.join(", ")
            : ""),
        120,
      );

      // Size / dimensions
      let size = str(
        d?.size ||
          catalogItem?.size ||
          d?.dimensions ||
          catalogItem?.dimensions ||
          parsedDesc.dimensions ||
          "",
        80,
      );
      if (
        !size &&
        catalogItem?.specifications?.dimensions?.width_ft &&
        catalogItem?.specifications?.dimensions?.height_ft
      ) {
        size = `${catalogItem.specifications.dimensions.width_ft} × ${catalogItem.specifications.dimensions.height_ft} ft`;
      }

      const structure = str(
        d?.structure ||
          catalogItem?.structure ||
          catalogItem?.specifications?.main_structure ||
          catalogItem?.specifications?.structure_type ||
          catalogItem?.entranceGateSpecs?.structureType ||
          catalogItem?.mandapSpecs?.structureType ||
          parsedDesc.structure ||
          "",
        200,
      );
      const platform = str(d?.platform || catalogItem?.platform || parsedDesc.platform || "", 200);
      const lighting = str(d?.lighting || catalogItem?.lighting || parsedDesc.lighting || "", 200);
      const flowers = str(d?.flowers || catalogItem?.flowers || parsedDesc.flowers || "", 200);
      const seating = str(d?.seating || catalogItem?.seating, 200);
      const customText = str(
        d?.customText ||
          catalogItem?.customText ||
          catalogItem?.welcomeBoardSpecs?.personalizationNotes,
        200,
      );
      const eventsField = str(
        d?.events || (Array.isArray(catalogItem?.events) ? catalogItem.events.join(", ") : ""),
        200,
      );

      const itemSnapshot = {
        id: decId,
        decorationId: decId,
        name: title,
        title,
        category,
        price,
        listedPrice: price,
        ...(priceUnit ? { priceUnit, price_unit: priceUnit } : {}),
        image,
        photo: image,
        ...(gallery.length > 0 ? { gallery } : {}),
        companyId: ownerCompanyId,
        companyName: ownerCompanyName,
        ownerCompanyId: ownerCompanyId,
        ownerCompanyName: ownerCompanyName,
        ...(description ? { description } : {}),
        ...(inclusions && inclusions.length > 0 ? { inclusions } : {}),
        ...(style ? { style } : {}),
        ...(colours ? { colours } : {}),
        ...(size ? { size, dimensions: size } : {}),
        ...(structure ? { structure } : {}),
        ...(platform ? { platform } : {}),
        ...(lighting ? { lighting } : {}),
        ...(flowers ? { flowers } : {}),
        ...(seating ? { seating } : {}),
        ...(customText ? { customText } : {}),
        ...(eventsField ? { events: eventsField } : {}),
      };

      console.log("[Server Saved Enquiry Item]:", JSON.stringify(itemSnapshot, null, 2));

      return itemSnapshot;
    }),
    subtotal: Number(e?.subtotal) || 0,
  }));
  return {
    id: `enq-web-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`,
    createdAt: new Date().toISOString(),
    type: input?.type === "direct-order" ? "direct-order" : "quotation-request",
    name,
    phone,
    whatsappNumber: whatsappNumber || phone,
    whatsapp_number: whatsappNumber || phone,
    whatsappSameAsPhone,
    email: str(input?.email, 160),
    message: str(input?.message, 4000),
    venue: str(input?.venue, 200),
    events,
    grandTotal: Number(input?.grandTotal) || events.reduce((s, e) => s + e.subtotal, 0),
  };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || "/", "http://localhost");
  const p = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (req.method === "GET" && p.startsWith("/uploads/")) {
      const name = path.basename(p);
      const file = path.join(UPLOAD_DIR, name);
      if (!fs.existsSync(file)) return send(res, 404, { error: "Not found" });
      res.writeHead(200, {
        "Content-Type": MIME[name.split(".").pop()] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      fs.createReadStream(file).pipe(res);
      return;
    }

    if (p === "/api/health") return send(res, 200, { ok: true });

    // ── Decorations ────────────────────────────────────────────────────────
    if (p === "/api/decorations" && req.method === "GET") {
      db = loadDb();
      const live = url.searchParams.get("status") === "live";
      const list = live
        ? db.decorations.filter((d) => String(d.status).toLowerCase() === "live")
        : db.decorations;
      return send(res, 200, { decorations: list });
    }
    if (p === "/api/decorations" && req.method === "PUT") {
      const body = await readJson(req);
      if (!Array.isArray(body?.decorations))
        return send(res, 400, { error: "decorations[] required" });
      db = loadDb();
      db.decorations = externalizeImages(body.decorations);
      persist();
      return send(res, 200, { ok: true, count: db.decorations.length });
    }

    // ── Enquiries ──────────────────────────────────────────────────────────
    if (p === "/api/enquiries" && req.method === "POST") {
      const rawBody = await readJson(req);
      db = loadDb();
      const enquiry = externalizeImages(normaliseEnquiry(rawBody));
      db.enquiries.unshift(enquiry);
      persist();
      return send(res, 201, { ok: true, id: enquiry.id });
    }
    if (p === "/api/enquiries" && req.method === "GET") {
      db = loadDb();
      return send(res, 200, { enquiries: db.enquiries });
    }

    return send(res, 404, { error: "Not found" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    return send(res, 400, { error: msg });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Decoration API listening on http://localhost:${PORT}`);
});
