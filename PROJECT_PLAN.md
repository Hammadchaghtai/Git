# Final Unified Project Plan
*(This document outlines all the agreed-upon features to be developed so nothing is missed during the coding phase)*

- **Dark Mode Feature & OLED UI Design:** 
  - *Main Canvas:* We will use **True Black (`#000000`)** for the main background. As you mentioned, this is the real essence of dark mode as it shuts off OLED pixels, saving battery and looking incredibly sleek.
  - *Elevation & Depth:* To prevent eye strain (halation), the Cards/Panels hanging over the background will use a very dark slate (`#0f172a`) so the eye can easily distinguish depth.
  - *Accents:* We will use vibrant, glowing colors (like Neon Azure Blue `#38bdf8` or Emerald) for buttons and active states so they "pop" safely on the black background. Text will be an off-white `#f8fafc` which feels premium.
  - *Light Mode Polish:* Even the light mode will be refined (using subtle off-white `#f4f6f9` backgrounds with pure white cards and soft shadows) to ensure the app looks top-tier no matter the theme.

## 2. Authentication & Login Flow
- **Clean Login Screen:** Remove the auxiliary "Guest Access" or "Continue as Auditor" buttons from the login page. The system will rely purely on standard Username/Password + TOTP 2FA. The backend will automatically recognizing roles (Super Admin, Admin, Auditor) and route them implicitly.
- **Unified Login Button:** Change the text of the main login button from "Login Admin Portal" to simply **"Login"** (or **"Sign In"**), as it serves all user roles.
- **Forced Setup on First Login:** Any new or reset account must change their temporary password and complete their profile immediately upon successful login.

## 3. Edit Profile & Admin Profiles
- **New Profile Fields:**
  - **Phone Number:** Optional for the Super Admin to provide when creating an account, but *Mandatory* for the user to fill/verify when they first log in.
  - **Designation / Job Title:** (e.g., Senior Auditor, InfoSec Analyst).
  - **Timezone Preference:** For accurate localized timestamps on scans and logs.
  - **Display Name & Profile Picture.**
- **Manage Admins Updates & Detail View:** The main table will show critical info (Username, Email, Role, Status, Password Changed). To prevent clutter, clicking the user's profile picture or a "View" button will slide out a **User Details Panel** showing their full information (Phone Number, Designation, Timezone, Session History).
- **Custom Time-Bound Auditor Access & Restore:** Instead of a hardcoded 2-week limit, the Super Admin will choose an exact Expiry Date & Time (from a calendar picker) when creating an Auditor. 
  - A *live countdown timer* (e.g., "Expires in 3d 12h") will show in the Manage Admins table. 
  - Once expired, the status changes to 'Inactive'. The Super Admin can click "Restore", which will prompt the calendar picker again to grant an extension (e.g., 2 more days).

## 4. Settings & Permissions
- **Sudo Mode for Email Server:** Updating SMTP configuration will trigger a password prompt to re-authenticate the Super Admin.
- **Functional Global Settings:** Linking the Threshold, Retention, and Auto-Scans to backend chron-jobs.
- **Remove Redundancies:** No "Change Password" or "Sign Out" duplicate buttons in the global settings area. Settings are restricted to Super Admins only.

## 5. Dashboard Activity Feed
- **Mini Audit Log Widget:** The main dashboard will feature a real-time event feed parsing backend audit logs (e.g., *"System Auto-Scan triggered"*, *"Policy updated by Admin"*), keeping the dashboard visually dynamic and informative.

## Expected Next Steps
Once approved, we will begin coding these features component by component, starting with database models and working up to the UI.
