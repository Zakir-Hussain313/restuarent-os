# Restaurant Name — File Inventory

Generated: 2026-07-31
Search pattern used: `rice.n.spice|rice-n-spice|Zaiqa` (case-insensitive), across `src/**/*.ts,*.tsx,*.json,*.md`

**Source of truth:** `src/config/restaurant.ts` already defines `name: "Zaiqa Restaurant"`.
Every other file below hardcodes the literal string `"Rice n Spice"` instead of importing
from that config. That's the actual root cause — not a naming typo in each file, but a
missing single source of truth. When renaming for a new tenant, either:
- (A) manually update each hardcoded occurrence below per tenant, or
- (B) refactor these to import `RESTAURANT_CONFIG.name` once, so future renames only touch one file.

This document supports (A) today; (B) is a suggested follow-up, not yet done.

---

## ⚠️ Not part of the rename — do not touch

These two files contain "Zaiqa" as a **menu item name** ("Zaiqa Special Burger"), unrelated
to the restaurant's own name. This is coincidental. Renaming the restaurant should NOT touch these.

| File | Line | Content |
|---|---|---|
| `src/features/website/data/menuData.ts` | 46 | `{ id: "bu1", name: "Zaiqa Special Burger", ... }` |
| `src/features/website/data/websiteContent.ts` | 24 | `name: "Zaiqa Special Burger",` |
| `src/features/website/data/websiteContent.ts` | 86 | `text: "Ordered delivery for our office lunch. ... The Zaiqa Special Burger is phenomenal. ..."` |

---

## ✅ Config — source of truth

| File | Line | Content |
|---|---|---|
| `src/config/restaurant.ts` | 2 | `name: "Zaiqa Restaurant",` |

---

## Files with hardcoded "Rice n Spice" — need updating per tenant

### Dashboard / admin pages

| File | Line | Content |
|---|---|---|
| `src/app/(dashboard)/dashboard/page.tsx` | 36 | `description="Welcome back. Here's what's happening at Rice n Spice today."` |
| `src/app/(dashboard)/menu/page.tsx` | 12 | `title: "Menu \| Rice n Spice",` |
| `src/app/(dashboard)/pos/page.tsx` | 5 | `title: "POS \| Rice n Spice",` |
| `src/app/layout.tsx` | 17 | `title: "Rice n Spice — Restaurant OS",` |

### Public website pages

| File | Line | Content |
|---|---|---|
| `src/app/(website)/about/page.tsx` | 23 | `Rice n Spice was born in 2016 from a simple belief — that authentic Pakistani food, cooked with the right spices and the right care, doesn't need shortcuts. Eight years later, that belief is still the foundation of everything we do.` |
| `src/app/(website)/about/page.tsx` | 71 | `Chef Imran Raza started Rice n Spice with recipes passed down through three generations — dishes that were never written down, only tasted, adjusted, and perfected over decades at the family table.` |
| `src/app/(website)/contact/page.tsx` | 82 | `<p className="text-sm font-medium text-[#1a1815]">Rice n Spice</p>` |

### Website components

| File | Line | Content |
|---|---|---|
| `src/features/website/components/landing/WhyUsSection.tsx` | 10 | `Why Rice n Spice` |
| `src/features/website/components/layout/WebsiteFooter.tsx` | 14 | `<span className="text-base font-bold tracking-tight">Rice n Spice</span>` |
| `src/features/website/components/layout/WebsiteFooter.tsx` | 107 | `<p className="text-xs text-white/30">© {new Date().getFullYear()} Rice n Spice. All rights reserved.</p>` |
| `src/features/website/components/layout/WebsiteNavbar.tsx` | 50 | `Rice n Spice` |

### Order / receipt modals (customer-facing print output)

| File | Line | Content |
|---|---|---|
| `src/features/orders/components/modals/BillModal.tsx` | 149 | `Rice n Spice` |
| `src/features/orders/components/modals/BillModal.tsx` | 282 | `Please visit again · Rice n Spice` |
| `src/features/orders/components/modals/KitchenTicketModal.tsx` | 132 | `<p className="text-xs text-gray-500">Rice n Spice</p>` |

---

## Package-level (internal identifier — likely leave as-is)

These are the npm package name, not user-facing. Only relevant if you're also renaming
the project folder/repo itself.

| File | Line | Content |
|---|---|---|
| `package.json` | 2 | `"name": "rice-n-spice",` |
| `package-lock.json` | 2 | `"name": "rice-n-spice",` |
| `package-lock.json` | 8 | `"name": "rice-n-spice",` |

---

## Not yet searched

The following locations weren't covered by the two searches run so far and may still
contain the name:
- Anything outside `src/`, `.json`, `.env`, `.md` extensions — e.g. `.env` values themselves
  weren't matched (no hits found, but worth double-checking manually if you store the name
  in an env var)
- `public/` folder assets (e.g. `manifest.json`, `robots.txt`, favicon alt text) — not searched
- Database seed data / migration SQL files, if any reference the name in seeded rows

## Summary count

- **13 files**, **17 line occurrences** of "Rice n Spice" requiring per-tenant update
- **1 file** already correct (`config/restaurant.ts`)
- **2 files / 3 occurrences** flagged as unrelated ("Zaiqa Special Burger" menu item — do not rename)
- **3 occurrences** in package files (internal identifier, optional)