# ICMS — UI/UX Design System ("Cyber-SaaS" Aesthetic)

## 1. Design Philosophy

The ICMS frontend has undergone a complete visual pivot from a generic Bootstrap-style admin panel to a premium **"Cyber-SaaS"** aesthetic. The design language draws from modern fintech dashboards, security operations centers, and enterprise SaaS platforms. Every element should feel polished, floating, and alive.

**Core Principles:**
1. **No visual clutter.** Remove borders, reduce density, maximize whitespace.
2. **Elevation over containment.** Use shadows to lift elements, not borders to cage them.
3. **Deep Violet identity.** The brand is not blue, not teal — it is **Deep Violet `#6D28D9`**.
4. **Responsive micro-interactions.** Buttons lift on hover, cards transition smoothly, pill badges feel tactile.

---

## 2. Tailwind CSS v4 Configuration

The design system is defined in `frontend/src/index.css` using Tailwind CSS v4's `@theme` directive:

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme {
  --color-brand-50: #f5f3ff;
  --color-brand-100: #ede9fe;
  --color-brand-600: #7c3aed;
  --color-brand-700: #6d28d9;
  --color-brand-800: #5b21b6;
  
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-400: #94a3b8;
  --color-slate-900: #0f172a;
  
  --color-surface: #f8fafc;  /* Global canvas */
  --color-card: #ffffff;     /* Card surfaces */
}
```

These tokens are referenced throughout the codebase as `bg-brand-700`, `text-brand-600`, `bg-surface`, etc.

---

## 3. Design Tokens Reference

### 3.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `brand-50` | `#f5f3ff` | Lightest violet tint. Active nav background. |
| `brand-100` | `#ede9fe` | Hover states, selected states. |
| `brand-600` | `#7c3aed` | Sidebar icon active state. |
| `brand-700` | `#6D28D9` | **Primary brand.** Buttons, headers, progress bars, active indicators. |
| `brand-800` | `#5b21b6` | Button hover state (deepened). |
| `slate-50` | `#f8fafc` | **Global canvas background.** The whole page sits on this. |
| `slate-100` | `#f1f5f9` | Secondary surfaces, table header backgrounds. |
| `slate-200` | `#e2e8f0` | Dividers, subtle borders (when absolutely necessary). |
| `slate-400` | `#94a3b8` | Muted text, timestamps, secondary labels. |
| `slate-900` | `#0f172a` | Primary text color. Deep charcoal, not pure black. |

### 3.2 Dark Mode Colors

Dark mode is toggled via a `dark` class on the `<html>` element (managed by `ThemeContext.jsx`). The CSS overrides in `index.css` ensure that dark mode is **elevated** — not dead black:

| Light Mode | Dark Mode Equivalent | Notes |
|---|---|---|
| `bg-white` | `#121721` | Warm dark navy, not `#000000` |
| `bg-slate-50` | `#0b0e14` | Deep zinc/navy blend |
| `bg-slate-100` | `#1a1f2e` | Elevated surface |
| `border-slate-100` | `#1e293b` | Subtle dark borders |
| `border-slate-200` | `#334155` | Medium dark borders |
| `shadow-xl` | `rgba(0, 0, 0, 0.4)` | Deeper, more dramatic shadows |
| `shadow-lg` | `rgba(0, 0, 0, 0.3)` | — |

---

## 4. Component Classes (CSS Layer)

### 4.1 `cyber-card`
The primary surface component. Used for all content containers.
```css
.cyber-card {
  @apply bg-white dark:bg-slate-900/50 backdrop-blur-sm 
         shadow-xl shadow-slate-200/50 dark:shadow-black/20 
         rounded-2xl border-0 transition-all duration-300;
}
```
**Rules:**
- **NO borders.** The shadow provides visual separation.
- **`rounded-2xl`** — 16px border radius. Not `rounded-lg` (8px), not `rounded-md` (6px).
- **`shadow-xl`** — Large, soft shadow. Creates the "floating" effect.
- `backdrop-blur-sm` — Subtle glassmorphism in dark mode.

### 4.2 `input-field`
Standard text input styling:
```css
.input-field {
  @apply rounded-xl border border-slate-200 dark:border-slate-800 
         bg-white dark:bg-slate-900 px-4 py-2.5 text-sm dark:text-white 
         focus:border-brand-600 focus:outline-none focus:ring-4 
         focus:ring-brand-600/10 transition-all placeholder:text-slate-400;
}
```

### 4.3 `btn-primary`
The brand button. Deep Violet with a lift effect.
```css
.btn-primary {
  @apply flex items-center justify-center gap-2 rounded-full 
         bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white 
         shadow-lg shadow-brand-700/25 transition-all 
         hover:bg-brand-800 hover:shadow-brand-700/40 hover:-translate-y-0.5 
         active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed 
         cursor-pointer;
}
```
**Key details:**
- `rounded-full` — Pill-shaped button, not rectangular.
- `hover:-translate-y-0.5` — Lifts 2px on hover.
- `active:translate-y-0` — Snaps back on click.
- `shadow-brand-700/25` — Colored shadow matching the button.

### 4.4 `btn-secondary`
Secondary/outline button:
```css
.btn-secondary {
  @apply flex items-center justify-center gap-2 rounded-full 
         bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
         px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 
         transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 
         hover:shadow-md cursor-pointer;
}
```

### 4.5 `status-pill`
Base class for status indicators:
```css
.status-pill {
  @apply inline-flex items-center px-3 py-1 rounded-full text-xs font-bold 
         transition-all;
}
```

---

## 5. Status Semantics ("Soft Pills")

Status indicators use soft, pastel backgrounds with matching text — never harsh primary colors:

### 5.1 Standard Status Pills

| Status | Background | Text | Example Usage |
|---|---|---|---|
| **Success / Pass / Active** | `bg-emerald-100 dark:bg-emerald-900/20` | `text-emerald-700 dark:text-emerald-400` | Scan results, policy status |
| **Alert / Fail / Critical** | `bg-rose-100 dark:bg-rose-900/20` | `text-rose-700 dark:text-rose-400` | Failed controls, critical risks |
| **System / Info / Pending** | `bg-brand-50 dark:bg-brand-900/20` | `text-brand-600 dark:text-brand-400` | System audit events |
| **Warning / Draft** | `bg-amber-100 dark:bg-amber-900/30` | `text-amber-700 dark:text-amber-500` | Draft policies, warnings |
| **Neutral / View-Only** | `bg-slate-100 dark:bg-slate-800` | `text-slate-600 dark:text-slate-400` | Auditor read-only badge |

### 5.2 Implementation Pattern
```jsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold 
                 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
  Active
</span>
```

### 5.3 Anti-Pattern (DO NOT USE)
```jsx
{/* ❌ WRONG — Harsh, Bootstrap-style badges */}
<span className="badge bg-danger text-white">Failed</span>
<span className="bg-red-600 text-white px-2 py-1 rounded">FAIL</span>

{/* ✅ CORRECT — Soft pastel pills */}
<span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold">Failed</span>
```

---

## 6. Layout Architecture

### 6.1 Shell Structure (`DashboardLayout.jsx`)

```
┌─────────────────────────────────────────────────────┐
│ flex h-screen overflow-hidden                       │
│ ┌─────────┐ ┌─────────────────────────────────────┐ │
│ │ Sidebar  │ │ Main Content                       │ │
│ │ w-64     │ │ flex-1 flex flex-col               │ │
│ │ bg-white │ │ ┌─────────────────────────────────┐ │ │
│ │          │ │ │ Top Bar (avatar + logout)       │ │ │
│ │ ┌──────┐ │ │ └─────────────────────────────────┘ │ │
│ │ │Brand │ │ │ ┌─────────────────────────────────┐ │ │
│ │ │Logo  │ │ │ │ <Outlet /> (page content)      │ │ │
│ │ └──────┘ │ │ │ bg-slate-50 p-8 overflow-auto  │ │ │
│ │ ┌──────┐ │ │ │                                 │ │ │
│ │ │ Nav  │ │ │ │                                 │ │ │
│ │ │Items │ │ │ └─────────────────────────────────┘ │ │
│ │ └──────┘ │ └─────────────────────────────────────┘ │
│ │ ┌──────┐ │                                        │
│ │ │Theme │ │                                        │
│ │ │Toggle│ │                                        │
│ │ └──────┘ │                                        │
│ └─────────┘                                         │
└─────────────────────────────────────────────────────┘
```

### 6.2 Sidebar Styling
- **Width:** `w-64` (256px), fixed.
- **Background:** `bg-white dark:bg-slate-950`.
- **Border:** Only `border-r border-slate-100` — the lightest possible divider.
- **Brand Block:** Shield icon in a `rounded-xl bg-brand-600` box with `shadow-lg shadow-brand-600/20`.
- **Brand Name:** `"ICMS"` in `text-[15px] font-bold tracking-tight`.
- **Portal Label:** `text-[11px] font-semibold text-slate-400 uppercase tracking-widest`.

### 6.3 Navigation Item States
```jsx
// Active state
'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 border-r-[4px] border-brand-600'

// Inactive state
'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
```

### 6.4 Theme Toggle
Located at the bottom of the sidebar. Uses `Moon` / `Sun` icons from Lucide React. Calls `toggleTheme()` from `ThemeContext` which toggles a `dark` class on `<html>`.

---

## 7. Typography

### 7.1 Font Stack
```css
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

### 7.2 Heading Conventions
| Element | Classes | Usage |
|---|---|---|
| Page title | `text-2xl font-bold text-slate-900 dark:text-white tracking-tight` | Top of every page |
| Section heading | `text-lg font-semibold text-slate-900 dark:text-white` | Card headers |
| Card stat value | `text-3xl font-black text-brand-700` | Dashboard KPI numbers |
| Metadata / timestamps | `text-xs text-slate-400` | Dates, secondary info |

---

## 8. Page Composition Patterns

### 8.1 Standard Page Layout
Every page follows this pattern:
```jsx
<div className="space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
        Page Title
      </h1>
      <p className="text-sm text-slate-500 mt-1">Page description</p>
    </div>
    <button className="btn-primary">
      <PlusCircle className="h-4 w-4" /> Action Button
    </button>
  </div>

  {/* Content Card */}
  <div className="cyber-card p-6">
    {/* ... */}
  </div>
</div>
```

### 8.2 Data Row Pattern (Flexbox Replacement for Tables)
Instead of HTML `<table>` tags, data rows use Flexbox:
```jsx
<div className="space-y-3">
  {items.map(item => (
    <div key={item.id} 
         className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 
                    rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <FileText className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
          <p className="text-xs text-slate-400">{item.subtitle}</p>
        </div>
      </div>
      <span className="status-pill bg-emerald-100 text-emerald-700">Active</span>
    </div>
  ))}
</div>
```

**CRITICAL RULE:** Do NOT use `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, or `<th>` in the React frontend. These are reserved exclusively for the xhtml2pdf backend templates where they are a technical necessity.

### 8.3 Stats/KPI Card Pattern
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="cyber-card p-6">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Total Agents
      </span>
      <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 
                      flex items-center justify-center">
        <Server className="h-5 w-5 text-brand-600" />
      </div>
    </div>
    <p className="text-3xl font-black text-slate-900 dark:text-white">{count}</p>
    <p className="text-xs text-slate-400 mt-1">Monitored endpoints</p>
  </div>
</div>
```

---

## 9. Interactive Elements

### 9.1 Buttons

| Type | Class | Shape | Shadow |
|---|---|---|---|
| Primary | `btn-primary` | `rounded-full` | `shadow-lg shadow-brand-700/25` |
| Secondary | `btn-secondary` | `rounded-full` | `hover:shadow-md` |
| Danger | Custom inline | `rounded-full` | `bg-rose-600 hover:bg-rose-700` |
| Icon-only | Custom | `rounded-xl` | `hover:bg-slate-100` |

### 9.2 Form Inputs
All inputs use `input-field` class. Dropdowns (`<select>`) follow the same styling.

### 9.3 Modals
Modals use a backdrop blur with a centered floating card:
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center 
                bg-black/40 backdrop-blur-sm">
  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 
                  max-w-md w-full mx-4 animate-slideIn">
    {/* Modal content */}
  </div>
</div>
```

### 9.4 Animations
```css
@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-slideIn { 
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
}
```

---

## 10. Scrollbar Styling

Custom scrollbar for webkit browsers:
```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { 
  background: #e2e8f0; 
  border-radius: 10px; 
  border: 2px solid transparent; 
  background-clip: content-box; 
}
.dark ::-webkit-scrollbar-thumb { background: #334155; }
```

---

## 11. Chart Styling (Recharts)

Recharts tooltips are overridden globally:
```css
.recharts-default-tooltip {
  @apply !bg-white/90 dark:!bg-slate-900/90 !backdrop-blur-md !border-0 
         !shadow-2xl !rounded-xl !p-4 !text-sm !font-medium 
         !text-slate-900 dark:!text-slate-100;
}
```

---

## 12. Auth Pages (Login, OTP, Forgot Password, Profile Setup)

Auth pages use a full-screen centered layout:
```jsx
<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0e14]">
  <div className="w-full max-w-md mx-4">
    {/* Brand header */}
    <div className="text-center mb-8">
      <div className="h-16 w-16 rounded-2xl bg-brand-700 mx-auto flex items-center justify-center 
                      shadow-lg shadow-brand-700/30">
        <Shield className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
        ICMS
      </h2>
    </div>
    
    {/* Form card */}
    <div className="cyber-card p-8">
      {/* Form fields using input-field class */}
    </div>
    
    {/* Footer */}
    <p className="mt-10 text-center text-[11px] font-black uppercase tracking-[0.2em] 
                  text-slate-400 dark:text-slate-600">
      &copy; 2026 ICMS PLATFORM · ALL SYSTEMS OPERATIONAL
    </p>
  </div>
</div>
```

---

## 13. Icon Library

All icons are from **Lucide React**. Commonly used icons:

| Icon | Usage |
|---|---|
| `LayoutDashboard` | Dashboard nav |
| `ScanLine` | Scan results nav |
| `ShieldCheck` | Frameworks nav |
| `FileText` | Policies nav / document icons |
| `BarChart3` | Reports nav |
| `Settings` | Settings nav |
| `Users` | Manage Admins nav |
| `Shield` | Brand icon (Super Admin / Admin) |
| `Eye` | Brand icon (Auditor) |
| `Moon` / `Sun` | Theme toggle |
| `Download` | PDF download buttons |
| `Loader2` | Loading spinner (with `animate-spin`) |
| `CheckCircle` | Success indicators |
| `AlertCircle` | Alert/error indicators |
| `ChevronRight` | List item arrows |

---

## 14. Branding Reference

| Element | Value |
|---|---|
| System Name | `"ICMS"` (sidebar brand) |
| Full Name | `"Intelligent Compliance Management System (ICMS)"` (PDF headers) |
| Portal Labels | `"Super Admin Portal"`, `"Admin Portal"`, `"Auditor Portal"` |
| Footer Text | `"© 2026 ICMS PLATFORM · ALL SYSTEMS OPERATIONAL"` |
| PDF Header | `"ICMS Compliance Report"` / `"ICMS Audit Trail"` |

---

## 15. Pending UI/UX Tasks

The following items require attention from the partner developer:

1. **Legacy `<table>` Removal:** Some pages may still contain HTML `<table>` structures. All must be replaced with Flexbox/Grid data rows.
2. **Empty States:** Implement branded SVG/icon empty states for lists with zero results. Use a centered layout with a muted icon and a helpful message.
3. **Loading Spinners:** Replace any text-based "Loading..." indicators with:
   ```jsx
   <div className="flex items-center justify-center py-20">
     <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
   </div>
   ```
4. **Modal Consistency:** Ensure all modals use `rounded-2xl shadow-2xl backdrop-blur-sm animate-slideIn`.
5. **Dropdown Menus:** Style all `<select>` elements and custom dropdowns with `rounded-xl border-slate-200`.
6. **Pagination Controls:** Style pagination with `rounded-full` buttons matching the `btn-secondary` pattern.
7. **Toast Notifications:** Ensure the access-denial toast uses the rose color palette and auto-dismisses after 5 seconds.

---

*Document generated from codebase analysis — April 23, 2026*
