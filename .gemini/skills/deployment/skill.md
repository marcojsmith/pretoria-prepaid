---
name: deployment
description: Deploy the application to Vercel and manage deployment workflows.
license: MIT
---

This skill guides deployment of the Pretoria Prepaid application to Vercel.

## Deployment Overview

The project uses Vercel for hosting with Convex as the backend.

## Vercel Dashboard Settings

These must be configured in the Vercel dashboard:

| Setting          | Value                                                |
| ---------------- | ---------------------------------------------------- |
| Root Directory   | Empty (or `.`)                                       |
| Build Command    | `cd app && bunx convex deploy --cmd 'bun run build'` |
| Install Command  | `cd app && bun install` (Override ON)                |
| Output Directory | `app/dist`                                           |

## Environment Variables

Required in Vercel:

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer domain
- `VITE_CONVEX_URL` - Convex deployment URL (auto-set by convex deploy)

## Deployment Commands

```bash
# Deploy from project root
bunx vercel

# Deploy to production
bunx vercel --prod

# Preview deployment
bunx vercel --preview

# View deployment logs
bunx vercel logs

# List deployments
bunx vercel list
```

## Build Process

1. **Install**: `bun install` in `app/` directory
2. **Convex Deploy**: Syncs backend functions to Convex cloud
3. **Frontend Build**: `bun run build` (runs TypeScript check + Vite build)
4. **Output**: Static files in `app/dist/`

## Pre-deployment Checklist

- [ ] Run `cd app && bun run lint` - No lint errors
- [ ] Run `cd app && bun run test` - All tests pass
- [ ] Run `cd app && bun run build` - Build succeeds
- [ ] Update version in `app/package.json` (SemVer)
- [ ] Set environment variables in Vercel dashboard
- [ ] Test locally with `bun run dev`

## Rollback

If a deployment fails:

1. Check logs: `bunx vercel logs`
2. Fix issues locally
3. Redeploy: `bunx vercel --prod`

## CI/CD

The project uses pre-commit hooks (Husky + lint-staged) for code quality. Ensure:

- All tests pass before pushing
- No lint warnings

## Troubleshooting

### Build fails

- Check `bunx vercel logs` for error details
- Ensure Convex functions are valid
- Verify environment variables are set

### 404 on page load

- Check `vercel.json` for rewrite rules
- Verify output directory is `app/dist`

### Convex connection issues

- Ensure `VITE_CONVEX_URL` is set
- Check Convex dashboard for function status
