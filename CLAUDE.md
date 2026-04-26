# Quickburrow

A React Router starter kit with Shadcn UI, designed to be adapter-driven for swappable email, storage, and database providers.

## Tech Stack

- **Framework**: React 19 + React Router 7 (SSR enabled)
- **Build**: Vite 7
- **Styling**: Tailwind CSS v4 + Shadcn UI (base-luma style, hugeicons)
- **Language**: TypeScript 5.9 (strict mode)
- **Fonts**: Geist Variable, Inter

Planned integrations: Better Auth, Bunny Database, Bunny Storage, Drizzle ORM, Resend.

## Project Structure

```
app/
  components/ui/   # Shadcn UI components
  lib/             # Utilities and shared code
  routes/          # React Router route modules
  welcome/         # Welcome page assets
```

## Path Aliases

`~/` maps to `./app/` — use `~/components`, `~/lib`, etc.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run typecheck` — generate types + type check

## Conventions

- **Server-only code**: use `.server.ts` suffix to prevent leaking into client bundles
- **Route modules**: place in `app/routes/`, export `loader`/`action`/`default`/`meta` per React Router 7 conventions
- **Route types**: import from `./+types/<route-name>` (auto-generated)
- **Components**: Shadcn components go in `app/components/ui/`, app components in `app/components/`
- **Styling**: use Tailwind utility classes; use `cn()` from `~/lib/utils` to merge classes
- **Icons**: use `@hugeicons/react` with icons from `@hugeicons/core-free-icons`
- **CSS colors**: defined as oklch() CSS variables in `app/app.css`

## Adding Shadcn Components

```sh
npx shadcn@latest add <component>
```

Components are configured via `components.json` to use the `~/components/ui` alias.

## Architecture Notes

- SSR is enabled by default (`react-router.config.ts`)
- The project uses `@react-router/serve` for production serving
- Vite plugins: `tailwindcss()`, `reactRouter()`, `tsconfigPaths()`
- Docker build is multi-stage (see `Dockerfile`)
