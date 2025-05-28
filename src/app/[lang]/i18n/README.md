# Internationalization (i18n) Setup

This directory contains the configuration for Next.js internationalization with next-intl.

## Structure

- `server.ts`: Server-side configuration for next-intl, used by the plugin in next.config.js
- `client.ts`: Client-side utilities for translations
- `translations.ts`: Re-exports from the central translations directory
- `index.ts`: Centralized exports for i18n functionality

## Architecture

The project uses a centralized approach to i18n:

1. **Config**: Language configuration is in `/src/config/language.ts`
2. **Translations**: Actual translation files are in `/src/translations/`
3. **Routing**: App Router uses `[lang]` parameter in routes with middleware support

## Usage

### Server Components

Server components automatically receive the translation context:

```tsx
// Server component example
export default async function Page({ params }: { params: { lang: string } }) {
  // Ensure the page is correctly localized
  setRequestLocale(params.lang);

  return (
    <div>
      {/* Access translations through client components */}
      <LocalizedHeading />
    </div>
  );
}
```

### Client Components

Import translations in client components:

```typescript
"use client";
import { useTranslations } from "@/app/[lang]/i18n";

const MyComponent = () => {
  const { t } = useTranslations();
  return <div>{t("key")}</div>;
};
```

### URL Handling

Configure locale-aware routing:

```typescript
// For client-side navigation
import { Link } from "@/app/[lang]/i18n";

// Use the Link component which automatically handles locale prefixing
<Link href="/some-path">Click me</Link>;
```
