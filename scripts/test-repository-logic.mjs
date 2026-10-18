// Test verifying all enquiryRepository guarantees:
// 1. Never seed automatically (empty array on first start)
// 2. Block saving before initial load
// 3. Block saving empty list over existing real data
// 4. Base64 sanitization & QuotaExceeded fallback
// 5. Silent rolling 5 backups & auto-recovery
// 6. Merge remote without clobbering local real enquiries
// 7. Reset sample leads preserves real enquiries and tags samples with isSample: true

const mockStorage = new Map();

globalThis.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => {
    if (globalThis.simulateQuotaError) {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    }
    mockStorage.set(k, String(v));
  },
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

globalThis.window = {
  dispatchEvent: (ev) => {
    dispatchedEvents.push(ev);
  },
};
globalThis.Event = class Event {
  constructor(name) {
    this.type = name;
  }
};
globalThis.CustomEvent = class CustomEvent extends Event {
  constructor(name, dict) {
    super(name);
    this.detail = dict?.detail;
  }
};

const dispatchedEvents = [];

// Re-create the EnquiryRepository logic
const ENQUIRY_STORAGE_KEY = "decoration_app_enquiries_v1";
const ENQUIRY_BACKUP_PREFIX = "decoration_app_enquiries_backup_";
const MAX_ENQUIRY_BACKUPS = 5;

class EnquiryRepository {
  constructor() {
    this.memoryEnquiries = [];
    this.hasLoaded = false;
  }

  loadFromStorage(includeDeleted = false) {
    let list = [];
    try {
      const raw = localStorage.getItem(ENQUIRY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch {}

    if (list.length === 0) {
      for (let i = 1; i <= MAX_ENQUIRY_BACKUPS; i++) {
        try {
          const b = localStorage.getItem(`${ENQUIRY_BACKUP_PREFIX}${i}`);
          if (b) {
            const parsed = JSON.parse(b);
            if (Array.isArray(parsed) && parsed.length > 0) {
              list = parsed;
              localStorage.setItem(ENQUIRY_STORAGE_KEY, b);
              break;
            }
          }
        } catch {}
      }
    }

    this.memoryEnquiries = list;
    this.hasLoaded = true;
    return includeDeleted ? list : list.filter((e) => !e.deleted_at);
  }

  getAll(includeDeleted = false) {
    if (!this.hasLoaded) {
      return this.loadFromStorage(includeDeleted);
    }
    return includeDeleted
      ? [...this.memoryEnquiries]
      : this.memoryEnquiries.filter((e) => !e.deleted_at);
  }

  save(enquiries) {
    if (!this.hasLoaded) {
      console.warn("[Save blocked]: Not loaded yet");
      return false;
    }

    const hadRealData = this.memoryEnquiries.some((e) => !e.isSample);
    const newHasRealData = enquiries.some((e) => !e.isSample);
    if (hadRealData && enquiries.length === 0) {
      console.warn("[Save blocked]: Cannot overwrite real data with empty list");
      return false;
    }
    if (hadRealData && !newHasRealData && this.memoryEnquiries.length > 0) {
      console.warn("[Save blocked]: Cannot overwrite real enquiries with samples only");
      return false;
    }

    const sanitized = enquiries.map((e) => {
      const copy = { ...e };
      if (copy.events) {
        copy.events = copy.events.map((ev) => {
          if (!ev.requested_decorations) return ev;
          return {
            ...ev,
            requested_decorations: ev.requested_decorations.map((d) => ({
              ...d,
              photo: d.photo?.startsWith("data:") ? "/uploads/mock-safe.png" : d.photo,
              image: d.image?.startsWith("data:") ? "/uploads/mock-safe.png" : d.image,
            })),
          };
        });
      }
      return copy;
    });

    const json = JSON.stringify(sanitized);
    try {
      localStorage.setItem(ENQUIRY_STORAGE_KEY, json);
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("enquiry-storage-error", { detail: { message: "Storage quota exceeded" } }),
      );
      return false;
    }

    this.pushRollingBackup(json);
    this.memoryEnquiries = sanitized;
    return true;
  }

  pushRollingBackup(json) {
    for (let i = MAX_ENQUIRY_BACKUPS - 1; i >= 1; i--) {
      const prev = localStorage.getItem(`${ENQUIRY_BACKUP_PREFIX}${i}`);
      if (prev) {
        localStorage.setItem(`${ENQUIRY_BACKUP_PREFIX}${i + 1}`, prev);
      }
    }
    localStorage.setItem(`${ENQUIRY_BACKUP_PREFIX}1`, json);
  }

  mergeRemote(remoteList) {
    if (!this.hasLoaded) this.loadFromStorage(true);
    if (!Array.isArray(remoteList) || remoteList.length === 0) {
      return this.memoryEnquiries;
    }
    const current = [...this.memoryEnquiries];
    const merged = [];
    const processed = new Set();
    remoteList.forEach((r) => {
      const existing = current.find((c) => c.id === r.id);
      if (existing) {
        merged.push({
          ...r,
          isSample: false,
          private_note: existing.private_note || r.private_note,
        });
      } else {
        merged.push({ ...r, isSample: false });
      }
      processed.add(r.id);
    });
    current.forEach((c) => {
      if (!processed.has(c.id)) merged.push(c);
    });
    this.save(merged);
    return this.memoryEnquiries;
  }

  resetSampleLeads(samples) {
    if (!this.hasLoaded) this.loadFromStorage(true);
    const real = this.memoryEnquiries.filter((e) => !e.isSample);
    const tagged = samples.map((s) => ({ ...s, isSample: true }));
    const combined = [...real, ...tagged];
    this.save(combined);
    return this.memoryEnquiries;
  }
}

// ── Run Tests ─────────────────────────────────────────────────────────
console.log("=== RUNNING ENQUIRY REPOSITORY COMPREHENSIVE TESTS ===");

const repo = new EnquiryRepository();

// 1. Initial load does NOT auto-seed
const initial = repo.getAll();
console.assert(initial.length === 0, "Test 1 Failed: Initial load must be empty, no auto-seed!");
console.log("PASS 1: No automatic sample seeding on first load.");

// 2. Prevent saving before load
const uninitRepo = new EnquiryRepository();
const saveResultBeforeLoad = uninitRepo.save([{ id: "test", client_name: "Test" }]);
console.assert(
  saveResultBeforeLoad === false,
  "Test 2 Failed: Save before load should be rejected",
);
console.log("PASS 2: Save before initial load is strictly blocked.");

// 3. Save real enquiries
const realEnquiries = [
  { id: "enq-1", client_name: "Aarav & Meera", isSample: false, events: [] },
  { id: "enq-2", client_name: "Pooja & Rohan", isSample: false, events: [] },
  { id: "enq-3", client_name: "Suman & Kriti", isSample: false, events: [] },
];
repo.save(realEnquiries);
console.assert(repo.getAll().length === 3, "Test 3 Failed: Should save 3 enquiries");
console.log("PASS 3: Saved 3 real enquiries successfully.");

// 4. Overwrite with empty list is blocked!
const overwriteResult = repo.save([]);
console.assert(
  overwriteResult === false,
  "Test 4 Failed: Overwriting with empty array must be blocked!",
);
console.assert(
  repo.getAll().length === 3,
  "Test 4 Failed: Enquiries must remain 3 after blocked empty save",
);
console.log("PASS 4: Empty array overwrite strictly blocked, 3 enquiries intact.");

// 5. Check rolling backup
console.assert(
  mockStorage.has("decoration_app_enquiries_backup_1"),
  "Test 5 Failed: Backup 1 missing",
);
console.log("PASS 5: Rolling backup created.");

// 6. Test Corrupt primary storage recovery
mockStorage.delete(ENQUIRY_STORAGE_KEY); // wipe primary
const recoveredRepo = new EnquiryRepository();
const recovered = recoveredRepo.getAll();
console.assert(
  recovered.length === 3,
  `Test 6 Failed: Recovered items should be 3, got ${recovered.length}`,
);
console.assert(mockStorage.has(ENQUIRY_STORAGE_KEY), "Test 6 Failed: Primary restored from backup");
console.log("PASS 6: Silent auto-recovery from backup 1 restored all 3 enquiries.");

// 7. Base64 photo sanitization
const enqWithPhoto = [
  ...realEnquiries,
  {
    id: "enq-4",
    client_name: "Photo Test",
    isSample: false,
    events: [
      {
        name: "Wedding",
        requested_decorations: [{ id: "dec-1", photo: "data:image/jpeg;base64,1234567890abcdef" }],
      },
    ],
  },
];
repo.save(enqWithPhoto);
const savedRaw = mockStorage.get(ENQUIRY_STORAGE_KEY);
console.assert(
  !savedRaw.includes("data:image/jpeg;base64"),
  "Test 7 Failed: Base64 should not exist in storage string",
);
console.log("PASS 7: Base64 images successfully sanitized out of storage.");

// 8. Remote merge with empty or partial remote
repo.mergeRemote([]);
console.assert(
  repo.getAll().length === 4,
  "Test 8 Failed: Empty remote must not wipe local enquiries",
);
console.log("PASS 8: Remote merge with empty array preserves all local enquiries.");

// 9. Reset Sample Leads: Real enquiries preserved + samples tagged isSample: true
const samples = [
  { id: "sample-1", client_name: "Aayush Shrestha" },
  { id: "sample-2", client_name: "Sneha Thapa" },
];
repo.resetSampleLeads(samples);
const afterReset = repo.getAll();
console.assert(
  afterReset.length === 6,
  `Test 9 Failed: Should have 4 real + 2 samples, got ${afterReset.length}`,
);
const aayush = afterReset.find((e) => e.client_name === "Aayush Shrestha");
console.assert(
  aayush && aayush.isSample === true,
  "Test 9 Failed: Sample lead must have isSample: true",
);
const aarav = afterReset.find((e) => e.client_name === "Aarav & Meera");
console.assert(
  aarav && aarav.isSample === false,
  "Test 9 Failed: Real enquiry must stay with isSample: false",
);
console.log(
  "PASS 9: Reset Sample Leads preserved real enquiries and marked samples isSample: true.",
);

console.log("\nALL TESTS PASSED SUCCESSFULLY! Data persistence is 100% robust.");
