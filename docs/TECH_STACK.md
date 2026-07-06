# Tech Stack Documentation

Admin TSLS OS is built using modern web development technologies focused on speed, type safety, and rapid development of internal tools and administrative dashboards.

## Core Architecture

### Frontend Framework
- **React (v18)**: The core UI library.
- **Vite**: The build tool and development server, chosen for its fast Hot Module Replacement (HMR).
- **TypeScript**: Used strictly across the codebase for type safety.
- **Refine (`@refinedev/core`)**: A React-based framework designed for building data-intensive applications. It abstracts away CRUD operations, routing, and state management, providing a unified API.

### Backend & Database
- **Supabase**: An open-source Firebase alternative. It provides:
  - **PostgreSQL Database**: The relational database storing all system data.
  - **Authentication**: Managing user sign-ups, logins, and sessions.
  - **Row Level Security (RLS)**: Enforcing data access policies directly at the database level.
- **Integration**: The frontend connects to Supabase via `@supabase/supabase-js` and Refine's dedicated provider `@refinedev/supabase`.

## UI & Styling
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **Radix UI Primitives**: Unstyled, accessible UI components (e.g., `@radix-ui/react-scroll-area`) used as building blocks for custom components.
- **Lucide React**: The icon library used throughout the application.
- **Utility Libraries**: `clsx`, `tailwind-merge`, and `class-variance-authority` (cva) are used for dynamic class name merging and component variant styling.

## Data Management & Forms
- **Routing**: `react-router-dom` (v6) is used for routing, integrated deeply with Refine.
- **Data Tables**: `@tanstack/react-table` combined with Refine's `@refinedev/react-table` for powerful, headless data grids (sorting, filtering, pagination).
- **Forms & Validation**: `react-hook-form` is used for performant form state management, validated using **Zod** schema validation (`zod`, `@hookform/resolvers`).

## Utilities & Features
- **Data Visualization**: `recharts` is used for rendering charts and dashboards.
- **Date Manipulation**: `date-fns` and `dayjs` are used for parsing and formatting dates.
- **Export Capabilities**:
  - `jspdf` and `html2canvas` for generating PDF reports (like e-Rapor).
  - `papaparse` for CSV parsing and generation.
- **Notifications**: `sonner` is used for toast notifications.

## Deployment
- The project is configured to be easily deployed to **Netlify** or **Vercel** as a static Single Page Application (SPA), utilizing the `netlify.toml` and `vercel.json` configurations.
