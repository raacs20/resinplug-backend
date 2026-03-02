# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ResinPlug Admin Backend — full-stack e-commerce admin panel + API server. Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Prisma 6 + PostgreSQL.

This is a **separate repo** from the frontend storefront (`C:\Projects\ResinPLug`). The frontend runs on port 3000, this backend runs on port 3001. They communicate via REST API with CORS configured in `src/middleware.ts`.

## Commands

```bash
npm run dev              # Dev server on port 3001
npm run build            # Production build (runs prisma generate first)
npm run lint             # ESLint
npm run db:push          # Push schema to DB (dev/prototyping, no migration file)
npm run db:migrate       # Create + apply migration (production-safe)
npm run db:seed          # Seed products
npm run db:seed-reviews  # Seed reviews
npm run db:reset         # Nuke + reseed DB (destructive, dev only)
npm run db:generate      # Regenerate Prisma Client after schema changes
```

**Windows gotcha:** `npm run dev` may fail with ENOENT. Use `node node_modules/next/dist/bin/next dev -p 3001` as fallback. The `.claude/launch.json` is configured this way.

**After any schema change:** Always run `npm run db:push` (dev) or `npm run db:migrate` (production), then `npm run db:generate` to regenerate the client.

## Mandatory: Test Everything You Build

**Every change must be verified before marking complete.** Do not rely on "it should work" — prove it works.

### After editing API routes:
1. Start the dev server (`npm run dev` or via `.claude/launch.json`)
2. Test the endpoint with curl or fetch — verify the actual response JSON
3. Test error cases: missing fields, invalid data, unauthorized access
4. Verify the response matches the expected format: `{ data: T }` for success, `{ error: { code, message } }` for errors

### After editing admin pages:
1. Navigate to the page in the browser and take a screenshot
2. Test every interactive element: buttons, forms, dialogs, toggles, filters, search
3. Submit forms and verify data persists (refresh the page and check it's still there)
4. Test loading states (skeleton loaders should appear)
5. Test empty states (what does the page look like with zero data?)
6. Test error states (what happens when the API is unreachable?)

### After editing the Prisma schema:
1. Run `npm run db:push` and verify it succeeds
2. Check that existing data isn't corrupted (query the affected tables)
3. Verify seed scripts still work if models changed

### General verification checklist:
- `npm run build` must pass with zero errors
- No TypeScript errors in changed files
- Console should have no uncaught errors or warnings
- All admin routes must require auth (use `requireAdmin()`)
- All decimal fields must be serialized before JSON response

## Architecture

### Tech Stack
- **Framework:** Next.js 15.1.0 (App Router) + React 19
- **Database:** PostgreSQL (Railway) via Prisma 6.0.0
- **Auth:** NextAuth v5 beta (JWT session strategy, credentials provider)
- **UI:** shadcn/ui (new-york style) + Lucide React icons + Recharts charts
- **Validation:** Zod schemas
- **Forms:** react-hook-form + @hookform/resolvers
- **Toasts:** Sonner (dark theme, top-right position)
- **Images:** Cloudinary SDK (cloudinary v2.9.0)
- **CSS:** Tailwind CSS v4 with oklch color theme

### Database (Prisma Schema)

20+ models. Key relationships:

```
Product → Variant[] (cascade delete)
Product → ProductImage[] (cascade delete)
Product → Review[] (cascade delete)
Product → StockMovement[] (cascade delete)
Product ←→ Collection (many-to-many via ProductCollection)
User → Order[] (set null on delete)
User → Credit[] (cascade delete)
User → Review[] (set null on delete)
User → Wishlist[], SavedAddress[]
User → CustomerNote[] (admin notes)
Order → OrderItem[] (cascade delete)
Order → OrderEvent[] (timeline/history)
Order → Refund[] (refund tracking)
Order → OrderNote[] (admin notes)
```

Additional models: ContentBlock (CMS), Notification, FAQ, StockMovement, ActivityLog

**Important patterns:**
- Prices are `Decimal(10,2)` — must be serialized before JSON response (see Serialization below)
- **Product-level `salePrice`/`originalPrice` are derived from the default variant** — never edit them independently (see Pricing Model below)
- Products use soft delete (`isActive` boolean), not hard delete
- OrderItem denormalizes product data (name, image, weight, price) to preserve history
- Coupon `usedCount` increments when order is created, not at validation time
- User `creditBalance` updated atomically via Prisma transactions in credit adjustment

### Product Pricing Model

Product-level `salePrice` and `originalPrice` are **derived from the default variant**, not managed as independent fields.

**Creating a product:** The New Product form includes a Variants tab where admin defines variants (weight, price, originalPrice, discount). One variant is marked as default (star icon). On submit, the default variant's price becomes the product's `salePrice`/`originalPrice`, and the full variants array is sent in the POST body.

**Editing a product:** The Edit Product form has no product-level price fields. Variant prices are edited inline (auto-save on blur). When the main "Save Changes" button is clicked, `getDefaultVariant()` calculates the product-level prices from the starred variant.

**Why:** This prevents price drift between the product and its variants. The product-level price is used for sorting/indexing, while actual pricing comes from variants.

### Authentication

- Admin login: `POST /api/admin/login` → sets JWT cookie
- Session check: `GET /api/auth/me` → returns user with role
- Admin guard: `requireAdmin()` from `src/lib/admin.ts` — use in every admin API route
- Cookie names: `authjs.session-token` (dev), `__Secure-authjs.session-token` (prod HTTPS)
- JWT contains: id, name, email, role, sub

### API Response Convention

All API routes use helpers from `src/lib/api-response.ts`:

```ts
// Success: { data: T, meta?: { page, limit, total, totalPages } }
return success(data)
return success(data, { meta: { page, limit, total, totalPages } })

// Errors: { error: { code: string, message: string } }
return badRequest("Validation failed")   // 400
return unauthorized()                     // 401
return forbidden("Admin access required") // 403
return notFound("Product not found")      // 404
return serverError()                      // 500
```

### Serialization (Critical)

Prisma Decimal fields don't auto-serialize to JSON. Always use:

```ts
import { serializeDecimals, formatProduct, formatReview } from "@/lib/serialize"

// For raw Prisma objects with Decimal fields:
return success(serializeDecimals(order))

// For products (converts prices to "$X.XX" strings):
return success(formatProduct(product))

// For reviews (flattens nested product into productName/productImage):
return success(formatReview(review))
```

**If you skip serialization, the API returns empty objects or crashes.** This is the #1 source of bugs.

### Pagination Convention

All list endpoints support:
- `page` (1-indexed, default 1)
- `limit` (default 20, max 100)
- Response includes `meta: { page, limit, total, totalPages }`

### Admin Dashboard Architecture

**Layout:** `src/app/admin/layout.tsx` — shadcn Sidebar + header with breadcrumb + TooltipProvider + Toaster

**Auth wrapper:** `AdminAuthProvider` in `src/app/admin/components/AdminAuthProvider.tsx`
- Calls `GET /api/auth/me` on mount
- Redirects to `/admin/login` if unauthenticated or role !== "admin"
- Provides `user`, `loading`, `logout()` via context

**Navigation groups:**
- Store: Dashboard, Products, Orders, Customers
- Marketing: Promotions, Reviews, Content
- System: SEO, Activity Log, Reports, Settings

**Login page:** Rendered without sidebar (detected via `pathname === "/admin/login"`)

### Admin Page Patterns

All admin pages follow this pattern:

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export default function AdminPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/endpoint", { credentials: "include" })
      .then(r => r.json())
      .then(res => setData(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [/* dependencies */]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ... render with loading skeletons, empty states, error handling
}
```

**Key conventions:**
- Always use `credentials: "include"` on fetch calls (required for JWT cookies)
- Always show Skeleton components during loading
- Always show meaningful empty states (icon + message, never blank page)
- Always use `toast.success()` / `toast.error()` for user feedback after actions
- Always use shadcn Dialog for create/edit forms, AlertDialog for destructive confirmations

### Variant Management Pattern

**Edit page auto-save:** The edit product page uses inline variant editing with auto-save on blur:
- Each variant field is an `<Input>` in the table row
- On blur, `handleSaveVariantField()` fires: `PUT /api/admin/products/[id]/variants` with `{ variantId, [field]: value }`
- Shows toast notification on success/error; reverts to server state via `fetchProduct()` on failure
- A spinner shows next to the row being saved (`savingVariantId` state)

**New product form:** All variants are built locally (no API calls until submit). On submit, the full array is sent in the POST body and created atomically with the product via Prisma `variants: { create: [...] }`.

**Default variant:** Both forms use a star icon to mark which variant is the "default" (shown on product cards). The default variant's price becomes the product-level `salePrice` on save.

**Variant API note:** PUT and DELETE for variants use `variantId` in the **request body**, not in the URL path:
```ts
// Update: PUT /api/admin/products/[id]/variants
{ variantId: "cuid-123", price: 25.00 }

// Delete: DELETE /api/admin/products/[id]/variants
{ variantId: "cuid-123" }
```

### CORS Configuration

`src/middleware.ts` — allowlist-based CORS for `/api/*` routes:
- `FRONTEND_URL` env var + localhost variants
- Production frontend URL hardcoded
- Update this file when deploying to new domains

### Activity Logging

`src/lib/activity-log.ts` exports `logActivity(adminId, action, entity, entityId?, details?)`.

**This should be called in every admin write operation** (create, update, delete) to maintain an audit trail. The ActivityLog model stores: adminId, action (e.g., "product.create"), entity (e.g., "product"), entityId, details, timestamp.

## Environment Variables

```env
DATABASE_URL="postgresql://..."     # Required: PostgreSQL connection string
AUTH_SECRET="<random-string>"       # Required: NextAuth JWT signing secret
FRONTEND_URL="http://localhost:3000" # Required: Frontend origin for CORS
CLOUDINARY_URL="cloudinary://..."   # Optional: For image uploads
```

## Admin Theme (CSS)

Dark-first theme in `src/app/admin/globals.css` using oklch colors:
- Primary/accent: `oklch(0.65 0.19 45)` (orange, matches frontend #EC691B)
- Background: dark by default, `.light` class for light mode
- shadcn CSS variables configured for both modes
- Imports: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`

## shadcn/ui Components

28 components installed in `src/components/ui/`. Config in `components.json`:
- Style: new-york
- Base color: neutral
- CSS variables enabled
- Path alias: `@/components/ui`

To add new components: `npx shadcn@latest add <component-name>`

## UX Standards for Admin Pages

Every admin page should feel professional and polished:

1. **Loading:** Show skeleton loaders that match the layout shape, never a blank page or spinner
2. **Empty states:** Show an icon + descriptive message + CTA button when there's no data
3. **Error states:** Show inline error messages, never just console.log errors
4. **Feedback:** Every user action (save, delete, toggle) must show a toast notification
5. **Confirmations:** Destructive actions (delete, deactivate) require AlertDialog confirmation
6. **Responsiveness:** Admin should work on tablet (768px+), not just desktop
7. **Consistency:** Use the same shadcn components everywhere — don't mix custom inputs with shadcn Input
8. **Data density:** Tables should show useful data at a glance — badges for status, color-coded values, formatted dates
9. **Quick actions:** Common tasks should be 1-2 clicks max, not buried in nested pages
10. **Breadcrumbs:** Every page should show where you are in the navigation hierarchy

## API Route Map

### Public (no auth required)
- `GET /api/products` — List products (paginated, filtered by category/search/sort)
- `GET /api/products/[slug]` — Single product with variants
- `GET /api/products/[slug]/reviews` — Reviews for a product
- `GET /api/search?q=` — Search products
- `GET /api/collections/[name]` — Products in a collection
- `GET /api/categories` — List category enums
- `GET /api/reviews` — All reviews (paginated)
- `POST /api/reviews` — Submit a review
- `POST /api/reviews/[id]/helpful` — Mark review helpful
- `POST /api/coupons/validate` — Validate coupon code
- `POST /api/shipping/calculate` — Calculate shipping options
- `POST /api/orders` — Create order (guest or authenticated)
- `GET /api/settings/public` — Public site settings
- `GET /api/health` — Health check

### Authenticated (user session required)
- `GET /api/orders` — User's order history
- `GET /api/orders/[id]` — Single order detail
- `GET/POST/DELETE /api/wishlist` — Wishlist CRUD
- `GET/POST/PUT /api/addresses` — Saved addresses CRUD
- `POST /api/addresses/[id]/default` — Set default address

### Auth
- `POST /api/auth/register` — Create account
- `GET /api/auth/me` — Current session user
- `POST /api/auth/signout` — Logout
- `POST /api/admin/login` — Admin login (sets JWT cookie)

### Admin (requireAdmin() protected)
- `GET/POST /api/admin/products` — List/create products
- `GET/PUT/DELETE /api/admin/products/[id]` — Single product CRUD
- `GET/POST /api/admin/products/[id]/variants` — List/create variants
- `PUT /api/admin/products/[id]/variants` — Update variant field (body: `{ variantId, [field]: value }`)
- `DELETE /api/admin/products/[id]/variants` — Delete variant (body: `{ variantId }`)
- `GET/PUT /api/admin/products/[id]/related` — Related products management
- `GET/POST/DELETE /api/admin/products/[id]/images` — Image CRUD
- `GET/PUT /api/admin/products/[id]/stock` — Stock management
- `GET /api/admin/orders` — List orders (paginated, filterable)
- `GET /api/admin/coupons` — List coupons
- `POST /api/admin/coupons` — Create coupon
- `GET/PUT/DELETE /api/admin/coupons/[id]` — Single coupon CRUD
- `GET /api/admin/customers` — List customers (paginated, searchable)
- `GET/POST /api/admin/customers/[id]/credits` — Credit history/adjustment
- `GET /api/admin/reviews` — List reviews (filterable)
- `GET/PUT/DELETE /api/admin/reviews/[id]` — Single review CRUD
- `GET /api/admin/dashboard` — Dashboard stats
- `GET/PUT /api/admin/settings` — Site settings CRUD
- `GET/PUT /api/admin/seo` — Page SEO management
- `GET/POST/PUT/DELETE /api/admin/marketing` — Discount CRUD
- `GET /api/admin/activity` — Activity log (paginated)
- `GET /api/admin/orders/[id]` — Order detail with items, events, refunds, notes
- `PATCH /api/admin/orders/[id]/status` — Update order status (creates OrderEvent)
- `PUT /api/admin/orders/[id]/tracking` — Update tracking info
- `GET/POST /api/admin/orders/[id]/refunds` — Refund management
- `GET/POST /api/admin/orders/[id]/notes` — Order notes
- `GET /api/admin/orders/[id]/events` — Order timeline
- `GET /api/admin/customers/[id]` — Customer detail with stats
- `PATCH /api/admin/customers/[id]` — Ban/unban customer
- `GET/POST /api/admin/customers/[id]/notes` — Customer notes
- `GET/PUT /api/admin/content` — CMS content blocks
- `GET /api/content` — Public content endpoint
- `GET/POST/PUT/DELETE /api/admin/faq` — FAQ management
- `GET/POST /api/admin/notifications` — Notification system
- `PUT /api/admin/notifications/read` — Mark notifications read
- `GET /api/admin/reports?range=&type=` — Analytics reports
- `POST /api/admin/products/[id]/clone` — Clone product
- `GET /api/admin/products/[id]/stock/history` — Stock movement history
- `POST /api/upload` — Image upload (Cloudinary)

## Cross-Repo Development

When building features that touch both frontend and backend:
1. **Schema first:** Add/modify Prisma models, push to DB
2. **API second:** Create/modify API routes with proper validation, auth, serialization
3. **Test API:** Verify endpoints return correct data via curl/browser
4. **Frontend last:** Build the UI that consumes the API
5. **End-to-end test:** Verify the full flow works from UI → API → DB → response → UI

The frontend repo at `C:\Projects\ResinPLug` has its own CLAUDE.md with component architecture, cart system, and styling conventions.

## Gotchas

- **Prisma Decimal → JSON:** Always serialize. See Serialization section above.
- **NextAuth v5 is beta:** Cookie name changes between dev/prod. Session token includes role.
- **Port 3001:** This backend is NOT on 3000. The frontend occupies 3000.
- **`credentials: "include"`:** Required on all admin fetch calls. Without it, JWT cookie isn't sent and you get 401.
- **Tailwind v4:** Uses `@theme inline` in CSS, not `tailwind.config.js`. shadcn components use CSS variables.
- **Soft deletes:** Products use `isActive` flag. Filter by `isActive: true` in public-facing queries.
- **Coupon codes:** Always uppercase. `code` field has unique constraint.
- **Order totals:** Calculated server-side in POST /api/orders. Never trust client-submitted totals.
- **SiteSetting:** Key-value store where all values are strings. Parse numbers/booleans in consuming code.
- **`.next` cache corruption:** When editing many files at once, the `.next` build cache can corrupt (module not found errors). Fix: `rm -rf .next && npx next build`
- **preview_start can't serve this repo** from the frontend project root. Use `nohup node node_modules/next/dist/bin/next dev -p 3001 &` via bash instead.
- **Prisma generate EPERM on Windows:** Dev server locks the query engine DLL. Kill all node processes first: `taskkill //F //IM node.exe` then `npx prisma generate`
- **Raw query BigInt serialization:** `prisma.$queryRaw` returns BigInt for COUNT/SUM. Use `Number(value)` to serialize before JSON response.
- **React.Fragment data-state warnings:** shadcn Select component passes `data-state` prop to Fragment — harmless console warning, not a real error.
- **Order stock deduction:** Stock is automatically deducted in `POST /api/orders` and restored on status change to "cancelled".
