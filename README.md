# UN Website Boilerplate

https://github.com/kleinlennart/un-website-boilerplate

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Maintenance

### Check for issues
```bash
npm audit          # Security vulnerabilities
npm outdated       # Outdated packages
npm run lint       # ESLint errors
npx tsc --noEmit   # TypeScript errors
```

### Update packages
```bash
npm update                                              # Safe patch/minor updates
npm install next@latest eslint-config-next@latest       # Update Next.js
```

### Update shadcn/ui components
```bash
npx shadcn@latest diff                                  # Check for component updates
npx shadcn@latest add <component-name> --overwrite      # Update specific component
```

### Clean install (if issues occur)
```bash
rm -rf node_modules .next && npm install
```

## Good to know

- use `npx shadcn@latest add <component-name>` when you need to add components.

- https://nextjs.org/docs/app/api-reference/file-conventions/src-folder
- https://nextjs.org/docs/app/getting-started/project-structure

- The `/public` directory should remain in the root of your project.
- Config files like `package.json`, `next.config.js` and `tsconfig.json` should remain in the root of your project.
- `.env.*` files should remain in the root of your project.
- `src/app` or `src/pages` will be ignored if `app` or `pages` are present in the root directory.
- If you are using a `src` directory, consider moving other application folders such as `/components` or `/lib` into `src` for consistency.
- If you are using a Proxy, ensure it is placed inside the `src` folder.
- When using Tailwind CSS, add the `/src` prefix to the `content` array in your `tailwind.config.js` file to ensure proper scanning.
- If you use TypeScript path aliases like `@/*`, update the `paths` object in `tsconfig.json` to include `src/`.
