# SIMS - Studio Inventory Management System

A professional-grade equipment tracking and rental management application for production companies, rental houses, and creative studios.

## Overview

SIMS provides comprehensive inventory management with client tracking, reservation scheduling, pack list creation, and detailed reporting. Built with React and designed for managing 1000+ equipment items with ease.

---

## Features

### Inventory Management
- **Equipment Tracking**: Manage items with detailed specifications, images, purchase info, and custom fields
- **Smart Search**: Fast, debounced search with category and status filters
- **Grid/List Views**: Toggle between visual grid and compact list layouts
- **Pagination**: Efficiently browse large inventories (24 items per page)
- **QR Code Labels**: Generate and print QR-coded labels for quick item lookup via camera scanning
- **Bulk Import/Export**: CSV import/export for batch data management

### Categories & Organization
- **Custom Categories**: Define equipment categories with per-category settings
  - Toggle quantity tracking (consumables vs. serialized items)
  - Serial number requirements
  - Low stock alert thresholds
- **Custom Specifications**: Define spec fields per category (required/optional) with drag-to-reorder
- **Hierarchical Locations**: Organize storage with buildings, rooms, shelves, and containers
- **Kits & Containers**: Group items into kits with nesting support

### Client Management
- **Client Database**: Track clients with contact info, type classification, and notes
- **Client Types**: Individual, Company, Agency, Non-Profit, Government, Other
- **Project Tracking**: Associate reservations and rentals with clients
- **Client History**: View rental history, active reservations, and project summaries
- **Favorites**: Mark frequently-used clients for quick access

### Packages
- **Gear Packages**: Create reusable equipment templates for common setups
- **Simple IDs**: Sequential package IDs (PKG-001, PKG-002, etc.)
- **Duplicate Prevention**: Validation prevents creating packages with duplicate names
- **Package Contents**: View and edit items included in each package

### Pack Lists
- **Job-Specific Lists**: Create equipment lists for individual shoots or projects
- **Package Integration**: Build pack lists from packages and/or individual items
- **Quantity Tracking**: Specify quantities for items that support it
- **Print/Export**: Generate printable pack lists with multiple format options
- **Edit Support**: Modify existing pack lists as project needs change
- **Duplicate Prevention**: Validation prevents creating pack lists with duplicate names

### Reservations & Scheduling
- **Calendar View**: Visual scheduling with day/week/month views
- **Reservations**: Book equipment for projects with dates, contact info, and notes
- **Conflict Detection**: Automatic alerts for overlapping reservations
- **Client Integration**: Link reservations to clients for tracking

### Check-Out/Check-In Workflow
- **Equipment Tracking**: Track who has equipment and when it's due back
- **Overdue Alerts**: Dashboard warnings for overdue items
- **Return Processing**: Streamlined check-in with condition notes

### Maintenance & Asset Tracking
- **Maintenance History**: Log repairs, calibrations, and service records with costs
- **Reminders**: One-time or recurring reminders (weekly, monthly, quarterly, yearly)
- **Depreciation Calculator**: Track asset value with multiple depreciation methods
- **Item Timeline**: Visual history of all checkouts, reservations, and maintenance
- **Insurance Reporting**: Generate reports for insurance valuations

### Administration
- **Multi-User Support**: Role-based access control (Admin/Staff/Viewer)
- **Custom Roles**: Create roles with granular permissions
- **Audit Log**: Track all system activity with timestamps and user attribution
- **Reports**: Inventory statistics, maintenance summaries, utilization reports
- **Database Export**: Full JSON backup of all data

### User Interface
- **Theme System**: 15+ built-in themes with CSS variables for instant switching
- **Custom Themes**: Create and save custom color schemes
- **Fun Themes**: Special themes with custom backgrounds and cursors (Cats, Dogs, Cheese)
- **Responsive Design**: Works on desktop, tablet, and mobile with collapsible sidebar
- **Layout Customization**: Per-user dashboard and item detail layout preferences
- **Drag-to-Reorder**: Reorder dashboard sections, spec fields, and categories

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| Styling | CSS-in-JS + CSS Custom Properties |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + Auth) or Local Demo Mode |
| State | React Hooks with Memoization |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 and login with:
- **Admin**: admin@studio.com / admin
- **User**: sarah@studio.com / user

---

## Project Structure

```
├── components/
│   └── ui.jsx                 # Reusable UI components (Badge, Button, Card, Modal, etc.)
│
├── supabase/
│   └── schema.sql             # Database schema for Supabase deployment
│
├── public/                    # Static assets (theme backgrounds, cursors)
│
├── App.jsx                    # Main app component, routing, global state
├── main.jsx                   # App entry point
├── index.css                  # Global styles, CSS variables, responsive breakpoints
│
├── constants.js               # Views, modals, status enums, defaults
├── theme.js                   # Design tokens and style objects
├── themes-data.js             # Theme definitions (colors, fonts)
├── ThemeContext.jsx           # Theme switching provider
├── hooks.js                   # Custom hooks (pagination, debounce)
├── utils.js                   # Utility functions (formatting, validation)
├── data.js                    # Sample/demo data
│
├── Sidebar.jsx                # Navigation with user menu and theme access
├── Dashboard.jsx              # Customizable dashboard with drag-to-reorder sections
├── GearList.jsx               # Paginated inventory grid/list view
├── ItemDetail.jsx             # Item view with collapsible sections
├── SearchView.jsx             # Global search interface
│
├── ClientsView.jsx            # Client management (list, detail, projects)
├── PackagesView.jsx           # Gear package templates
├── PackListsView.jsx          # Job-specific pack lists
├── ScheduleView.jsx           # Calendar/list scheduling view
├── ReservationDetail.jsx      # Reservation details and management
│
├── AdminPages.jsx             # Full-page admin: Add Item, Specs, Categories
├── Views.jsx                  # Admin Panel, Reports, Audit Log
├── RolesManager.jsx           # Role and permission management
├── LocationsManager.jsx       # Hierarchical location management
│
├── Modals.jsx                 # Modal dialogs (Edit Item, Reservations, etc.)
├── LabelsView.jsx             # QR label generation and printing
│
├── MaintenanceSection.jsx     # Maintenance history logging
├── RemindersSection.jsx       # Reminder management
├── NotesSection.jsx           # Threaded notes with replies
├── KitSection.jsx             # Kit/container management
├── ItemTimeline.jsx           # Visual item history
├── DepreciationCalculator.jsx # Asset depreciation tracking
│
├── ThemeSelector.jsx          # Theme browsing and selection
├── CustomThemeEditor.jsx      # Custom theme creation
├── LayoutCustomize.jsx        # Dashboard/detail layout customization
├── ProfileModal.jsx           # User profile settings
├── PermissionsContext.jsx     # Permission checking provider
├── ChangeLog.jsx              # Application change history
└── NotificationSettings.jsx   # Email notification preferences
```

---

## Theme System

SIMS uses CSS custom properties for instant, flicker-free theme switching.

### Built-in Themes

| Category | Themes |
|----------|--------|
| Dark | Default Dark, Midnight, Slate, Charcoal |
| Light | Light, Cream |
| Colorful | Ocean, Forest, Sunset, Berry, Copper |
| Special | High Contrast, Cats 🐱, Dogs 🐕, Cheese 🧀 |

### Adding a Custom Theme

Use the built-in Custom Theme Editor (Settings → Themes → Create Custom) or edit `themes-data.js`:

```javascript
{
  id: 'my-theme',
  name: 'My Theme',
  colors: {
    '--bg-dark': '#1a1a2e',
    '--bg-medium': '#16213e',
    '--bg-light': '#1f2b47',
    '--primary': '#e94560',
    '--text-primary': '#ffffff',
    '--text-secondary': '#a0aec0',
    // ... additional CSS variables
  }
}
```

### Using Theme in Components

```javascript
import { useTheme } from './ThemeContext.jsx';

function MyComponent() {
  const { themeId, setTheme, availableThemes } = useTheme();
  // Theme colors available via CSS variables: var(--primary), var(--bg-dark), etc.
}
```

---

## Production Deployment

### Option 1: Supabase Backend

1. **Create Supabase Project**
   - Sign up at https://supabase.com
   - Create a new project

2. **Initialize Database**
   - Go to SQL Editor
   - Run contents of `supabase/schema.sql`

3. **Configure Environment**
   ```bash
   # Create .env.local
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Deploy**
   ```bash
   npm run build
   # Deploy dist/ folder to Vercel, Netlify, or your hosting provider
   ```

### Option 2: Demo Mode (Local Storage)

The app runs in demo mode by default, storing data in browser localStorage. Perfect for evaluation and small-scale use.

---

## Performance Optimizations

Designed for inventories of 1000-2000+ items:

| Optimization | Implementation |
|--------------|----------------|
| Pagination | 24 items per page with keyboard navigation |
| Debounced Search | 200ms delay prevents excessive filtering |
| Memoization | React.memo on all components |
| Lazy Loading | Images load on scroll into view |
| CSS Variables | Theme changes without component re-renders |
| Modular Structure | Code splitting ready |

---

## Sample Data

The demo includes realistic sample data:

| Category | Items | Examples |
|----------|-------|----------|
| Cameras | 15 | Sony A7S III, Canon R5, RED Komodo |
| Lenses | 15 | Sony 24-70mm GM, Canon RF 70-200mm |
| Lighting | 12 | Aputure 600d, Astera Titan Tubes |
| Audio | 10 | Sennheiser MKH 416, Zoom F8n Pro |
| Support | 8 | Sachtler tripods, DJI RS 3 Pro |
| Grip | 6 | C-stands, 12x12 frames, doorway dolly |
| Monitors | 5 | SmallHD Cine 7, Atomos Ninja V+ |
| Storage | 5 | CFexpress cards, portable SSDs |
| Power | 5 | V-Mount batteries, chargers |
| Accessories | 5 | Follow focus, cages, ND filters |

**Totals**: 86+ items, 8+ gear packages, sample clients, reservations, and maintenance records

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## License

MIT License - See LICENSE file for details
