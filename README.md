# OmniSupport - Call & Query Support Management System (GitHub Host Ready)

An interactive, responsive HTML5/JS web application for logging, managing, forwarding, and resolving customer support calls and query tickets with strict **1-Hour SLA Tracking**, **Dual User Role Architecture (Admin & Employee)**, **First-Login Security Gate**, and **1-Month Auto-Export & Purge to Excel**.

---

## 🔒 First Login Security Gate

When the portal is first opened, the user must authenticate through the **Login Screen**. Access to the dashboard, master sheets, forms, and ticket management is blocked until valid credentials are provided.

### 🔑 Default Credentials for Login:

| Role | Username | Password | Full Name | Department | Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin` | System Administrator | Technical Support | Full master access, employee/password management, settings |
| **Employee** | `emp_rahul` | `123` | Rahul Sharma | Technical Support | Call logging (In/Out), SLA queue, forward/resolve queries |
| **Employee** | `emp_priya` | `123` | Priya Patel | Billing & Accounts | Call logging (In/Out), SLA queue, forward/resolve queries |
| **Employee** | `emp_alex` | `123` | Alex Johnson | Customer Logistics & Delivery | Call logging (In/Out), SLA queue, forward/resolve queries |

> 💡 **Quick Demo Fill:** On the Login Screen, click the **👑 Admin** or **🧑‍💻 Staff** 1-click buttons to instantly log in without typing.
> 🚪 **Logout:** Click the red **Logout** button in the top-right header anytime to lock the dashboard and return to the login screen.

---

## 🌐 How to Host on GitHub Pages (Step-by-Step)

The entire system is 100% self-contained (HTML5, Tailwind CSS via CDN, SheetJS via CDN, pure JavaScript LocalStorage database) and designed to run on **GitHub Pages** with zero configuration.

### Step 1: Initialize Git Repository
In your project folder (`query_management_system/`), open terminal or command prompt:

```bash
git init
git add .
git commit -m "Deploy OmniSupport Call & Query Management System"
git branch -M main
```

### Step 2: Create a Repository on GitHub
1. Go to [GitHub](https://github.com/new) and create a new repository (e.g. `omnisupport-crm`).
2. Link your local project to GitHub and push:

```bash
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPOSITORY-NAME>.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. On GitHub, go to your repository **Settings** tab.
2. In the left sidebar, click **Pages**.
3. Under **Branch**, select `main` branch and `/ (root)` folder.
4. Click **Save**.
5. Within 1 minute, GitHub will provide your live URL:
   `https://<YOUR-USERNAME>.github.io/<YOUR-REPOSITORY-NAME>/`

---

## 💻 Local Testing (Without Server)
You can also open [`index.html`](file:///C:/Users/Admin/.gemini/antigravity/scratch/query_management_system/index.html) directly in any web browser:

```powershell
# Windows PowerShell command:
Start-Process "C:\Users\Admin\.gemini\antigravity\scratch\query_management_system\index.html"
```

---

## 📋 Comprehensive Feature Checklist

1. **Authentication Gate (First Login Required)**:
   - Full login overlay blocking dashboard access until valid credentials are authenticated.
   - Show/hide password toggle, error alert messaging, and session persistence.
   - Secure Logout action in top navigation bar.

2. **Admin User Portal**:
   - **Add Employee**: Create new staff with Role (Admin/Employee), Department, Username, Initial Password, and Phone.
   - **Reset Credentials**: 1-click modal to edit/reset usernames and passwords.
   - **Add Department & Types of Query**: Add new organizational units and custom query categories with priority tagging.
   - **Master Sheets**: Filterable tables for *All Employees*, *Pending Queries*, *Done / Resolved Queries*, and *Forwarded Queries*.

3. **Employee User Portal**:
   - **2 Call Forms**: Switch between **📥 Incoming Call** and **📤 Outgoing Call**.
   - **Call Purpose**: Switch between **❓ Query Call** and **📝 Status Update Call**.
   - **Form Fields**: Department, Barcode, Caller Name, Caller No., Client Code, Types of Query, Auto Date & Time pick, Call End Time (manual input or 1-click `⏱️ Now` sync), Call Notes.
   - **Auto Ticket Generation**: Collision-proof sequential Ticket No (`TKT-YYYYMMDD-XXXX`).

4. **1-Hour Strict SLA Resolution Engine**:
   - Every logged query runs on a strict **60-minute resolution timer**.
   - **Right-Side Pending Queries Sidebar**: Real-time live countdown displaying remaining time, user name, barcode, department, client code, and urgency level (🟢 *Safe > 30m*, 🟡 *Warning 10-30m*, 🔴 *Critical < 10m*, ⚠️ *Blinking Overdue Alert*).
   - Quick action buttons on each card: **Resolve**, **Forward**, and **View Details**.

5. **Universal Search & Filtering**:
   - **Global Search Bar**: Instant real-time filter across Ticket ID, Barcode, Caller Name, Caller No, Client Code, Dept, Query Type, and Notes.
   - **Column-wise Filters**: Direct search inputs above table columns.

6. **Auto Delete & Monthly Excel Export**:
   - **Excel (.xlsx) Export**: Instant formatted spreadsheet download powered by SheetJS.
   - **30-Day Auto-Archive Notice**: Top banner detects records older than 1 month, prompting an automatic Excel backup before clearing archived records.

---

## 📁 Repository Structure
```
query_management_system/
├── index.html            # Main web hostable portal with Login Gate, Admin & Employee views
├── css/
│   └── styles.css        # Custom styles, animations, glowing SLA timer badges & responsive UI
├── js/
│   ├── app.js            # UI controller, auth gate, forms, role switcher, navigation, modals, search
│   ├── db.js             # LocalStorage & database engine (Auth, CRUD, auto-purge, initial seed data)
│   └── sla-timer.js      # Real-time 1-hour SLA countdown engine & progress calculations
└── README.md             # GitHub documentation, setup guide, and credentials
```
