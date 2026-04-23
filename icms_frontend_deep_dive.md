# ICMS — Frontend Engineering Deep Dive (Exhaustive Technical Analysis)

## 1. Introduction: High-Fidelity SPA Architecture

The ICMS frontend is a high-performance Single Page Application (SPA) built on **React 18** and **Vite 5**. The architecture is designed to handle complex GRC data visualizations while maintaining a strict security posture. The design system, **"Cyber-SaaS,"** leverages **Tailwind CSS v4** to create a premium, executive-level experience characterized by glassmorphism, deep violet accents, and high-contrast typography.

---

## 2. Routing & Security Guards: The Navigation Fortress

The routing layer in `App.jsx` is the primary defensive perimeter of the application. It uses **React Router 6** to enforce session state and role-based access before any component is even mounted.

### 2.1 Guard Component Implementations
Located in `src/App.jsx`.

```jsx
/** ── ProtectedRoute: The Session & Role Guard ────────────────── **/
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, role, needsSetup, loading } = useAuth();

  if (loading) return <LoadingScreen />; // Prevent flash of unauthenticated state
  
  // 1. Check for valid JWT session
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // 2. Enforce "Setup Jail" (Password Reset / Profile Hardening)
  if (needsSetup) return <Navigate to="/profile-setup" replace />;

  // 3. Role-Based Access Control (RBAC) Enforcement
  if (requiredRole && role !== requiredRole) {
    console.warn(`[RBAC] Access denied for role: ${role}`);
    return <Navigate to="/" replace />;
  }

  return children;
}

/** ── SetupRoute: The Profile Setup Guard ─────────────────────── **/
function SetupRoute({ children }) {
  const { isAuthenticated, needsSetup, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // Only allow access if the user specifically needs setup
  if (!needsSetup) return <Navigate to="/" replace />;

  return children;
}
```

**Line-by-Line Logic Analysis**:
*   **`if (loading)`**: This is critical for preventing "Layout Flickering." On initial load, the `AuthContext` is fetching the user profile from the backend. We must block rendering until we know the user's status.
*   **`isAuthenticated` check**: If the local `grc_access_token` is missing or invalid, the user is immediately kicked back to the login screen.
*   **`needsSetup` check**: This creates a "Logical Jail." If the backend flags the user for setup (e.g., after an admin-triggered password reset), they cannot access the dashboard or policies until they navigate the `/profile-setup` flow.
*   **`requiredRole` check**: This is the frontend's RBAC enforcement. It compares the user's role (extracted from the `UserProfile` model) against the page requirements. For example, `/manage-admins` is wrapped in a `ProtectedRoute` with `requiredRole="super_admin"`.

---

## 3. Auth State & Axios Interceptors: The Refresh Loop

The most complex engineering in the ICMS frontend resides in `src/api/axios.js`. It implements an atomic JWT refresh mechanism that ensures the user never sees a `401 Unauthorized` error if a valid refresh token exists.

### 3.1 The Axios Interceptor Implementation

```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
});

// 1. Request Interceptor: Inject JWT
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('grc_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: The Refresh Dance
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A. Handle 401 (Unauthorized) with Retry Logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('grc_refresh_token');

      if (refreshToken) {
        try {
          const resp = await axios.post('http://localhost:8000/api/auth/token/refresh/', {
            refresh: refreshToken
          });
          
          const { access } = resp.data;
          localStorage.setItem('grc_access_token', access);
          
          // Re-execute original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return API(originalRequest);
        } catch (refreshError) {
          // Refresh token is dead - force logout
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }

    // B. Handle 403 (Forbidden) - RBAC Failure
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('grc-access-denial', {
        detail: error.response.data.detail || 'Permission Denied'
      }));
    }

    return Promise.reject(error);
  }
);
```

**Technical Explanation of the "Refresh Dance"**:
1.  **Interception**: Every response is checked for a `401` status.
2.  **Retry Locking**: `originalRequest._retry = true` prevents an infinite loop if the refresh also fails.
3.  **Atomic Refresh**: The client calls the `/token/refresh/` endpoint directly (using standard `axios` to avoid the interceptor loop).
4.  **Token Rotation**: If successful, the new access token is stored, and the **original failed request is re-triggered** with the updated header.
5.  **Event Broadcasting**: The `403` handler dispatches a `grc-access-denial` event. This is caught by the `DashboardLayout.jsx` shell to trigger a global red Toast notification, informing the user *exactly* why their action was blocked (e.g., "Auditors cannot modify policies").

---

## 4. "Cyber-SaaS" UI Engineering: Death of the `<table>`

The ICMS frontend has achieved a **100% Table-Free** operational UI. Every data list is constructed using a "Cyber-Card" Flexbox architecture.

### 4.1 The Flexbox Data Row Spec
Extracted from `src/pages/Policies.jsx`.

```jsx
<div key={p.id} className="flex flex-col">
  <div 
    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
    className="cyber-card p-5 group cursor-pointer transition-all hover:translate-x-1 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-transparent hover:border-brand-100 dark:hover:border-brand-900/30"
  >
    {/* Identity Section */}
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 shadow-sm flex-shrink-0">
        <FileText className="w-6 h-6" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-black text-slate-900 dark:text-white text-lg truncate">{p.title}</span>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Updated {date}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${STATUS_COLORS[p.status]}`}>
            {p.status}
          </span>
        </div>
      </div>
    </div>

    {/* Metric Section */}
    <div className="flex items-center gap-12 md:gap-16">
      <div className="flex flex-col min-w-[120px]">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mapped Controls</span>
        <div className="flex flex-wrap gap-1">
          {p.controls?.slice(0, 2).map(c => (
            <span key={c.id} className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-brand-700 border border-slate-100">
              {c.control_code}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
</div>
```

**Why Flexbox instead of `<table>`?**
*   **Responsiveness**: Tables are notoriously difficult to responsive-stack. Flexbox allows the metric section to naturally wrap under the identity section on mobile devices.
*   **Animations**: `hover:translate-x-1` and `scale-[1.01]` animations cause visual jitter in standard `<tr>` elements due to the rigid nature of table cells. Flex-rows are independent DOM nodes that animate smoothly.
*   **Styling**: Achieving a `rounded-2xl` border with a `shadow-xl` on a table row is a CSS nightmare involving `border-spacing` hacks. In the Cyber-Card system, it is a single Tailwind utility class.

### 4.2 Tailwind v4 Design Tokens
Located in `src/index.css`.

```css
@theme {
  --color-brand-50: #f5f3ff;
  --color-brand-600: #7c3aed;
  --color-brand-700: #6d28d9; /* The Signature "Deep Violet" */
  
  --color-slate-900: #0f172a; /* The "Midnight" background for Dark Mode */
  
  --color-surface: #f8fafc; /* Global Background: Cool off-white */
}

.status-pill {
  @apply inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all;
}
```

**Psychology of the Palette**:
*   **Deep Violet (#6D28D9)**: Chosen for its association with high-tier enterprise security and intelligence. It provides a "Premium SaaS" feel that contrasts against the typical "Corporate Blue" of legacy GRC tools.
*   **Soft Pills**: ICMS avoids harsh red/green colors. Instead, it uses high-luminance backgrounds (`bg-emerald-100`) with saturated text (`text-emerald-700`). This reduces eye strain for auditors spending hours in the platform while still providing clear semantic status triggers.

---

## 5. Performance Engineering: Memoization

To ensure that 1000+ data rows do not degrade the UI, `Policies.jsx` and `Dashboard.jsx` use extensive memoization.

*   **`useMemo`**: The policy search and filtering logic (`filtered = policies.filter(...)`) is wrapped in a `useMemo` hook with `search` as a dependency. This ensures that the filter only runs when the user types, not on every re-render.
*   **`useCallback`**: All event handlers (e.g., `openEdit`, `handleDelete`) are memoized to prevent the `PolicyModal` and `PolicyRow` components from re-rendering unnecessarily.

---
*Document produced by Principal Frontend Architect — Revision 2.0*
*Length: ~490 Lines*
