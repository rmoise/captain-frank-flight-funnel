# Universal Navigation System - Implementation Guide

## Overview

The Universal Navigation System ensures consistent language-aware navigation across all phases in your Next.js 15 application. This system eliminates language persistence issues when navigating between pages.

## Key Features

- ✅ **Language-aware navigation** - All navigation preserves the current language
- ✅ **Consistent phase transitions** - Standardized forward/backward navigation
- ✅ **Automatic language detection** - Extracts language from URL or router params
- ✅ **Cookie-based language persistence** - Sets NEXT_LOCALE cookie for next-intl
- ✅ **Type-safe navigation** - Full TypeScript support with ValidationPhase enum
- ✅ **Backward compatibility** - Maintains existing API while adding new features

## Core Components

### 1. Navigation Utilities (`src/utils/navigation.ts`)

The heart of the system with utilities for:

- Language extraction from URLs
- Phase-to-URL mapping
- Language-aware URL building
- Phase sequence management

### 2. Universal Navigation Hook (`useUniversalNavigation`)

Main hook providing navigation methods:

```typescript
const {
  navigateToPhase,
  navigateToNextPhase,
  navigateToPreviousPhase,
  navigateToUrl,
  changeLanguage,
  goBack,
  getCurrentLanguage,
  getCurrentPhase,
} = useUniversalNavigation();
```

### 3. Enhanced Buttons

Updated `ContinueButton` and `BackButton` components with universal navigation support.

## Implementation Steps

### Step 1: Update Existing Phase Navigation

Replace manual router.push calls with universal navigation:

**Before:**

```typescript
// ❌ Old approach - language can be lost
const handleContinue = () => {
  router.push("/phases/compensation-estimate");
};
```

**After:**

```typescript
// ✅ New approach - language preserved
const { navigateToPhase } = useUniversalNavigation();

const handleContinue = () => {
  navigateToPhase(ValidationPhase.COMPENSATION_ESTIMATE);
};
```

### Step 2: Update Button Components

#### Enhanced ContinueButton Usage

```typescript
// Option 1: Use universal navigation with custom logic
<ContinueButton
  onClick={handleCustomLogic}  // Execute business logic first
  useUniversalNav={true}       // Enable universal navigation
  navigateToPhase={ValidationPhase.FLIGHT_DETAILS}
  disabled={!isValid}
  isLoading={isLoading}
/>

// Option 2: Pure universal navigation (no custom logic)
<ContinueButton
  useUniversalNav={true}
  navigateToPhase={ValidationPhase.TRIP_EXPERIENCE}
  disabled={!canContinue()}
/>
```

#### Enhanced BackButton Usage

```typescript
// Option 1: Auto-detect previous phase
<BackButton
  useUniversalNav={true}
  useBackHistory={true}  // Use browser back or auto-detect previous phase
/>

// Option 2: Navigate to specific phase
<BackButton
  useUniversalNav={true}
  navigateToPhase={ValidationPhase.FLIGHT_DETAILS}
/>

// Option 3: Navigate to custom URL
<BackButton
  useUniversalNav={true}
  navigateToUrl="/phases/initial-assessment"
/>
```

### Step 3: Update Language Switcher

Replace existing language switcher with the universal one:

```typescript
import { LanguageSwitcher } from "@/components/shared/navigation/LanguageSwitcher";

// Simple usage - automatically preserves current path and state
<LanguageSwitcher />;
```

### Step 4: Phase-by-Phase Migration

Update each phase to use the universal navigation system:

#### Initial Assessment Phase

```typescript
// In handleContinue function
const { navigateToPhase } = useUniversalNavigation();

const handleContinue = async () => {
  // Execute business logic (validations, API calls, etc.)
  await performBusinessLogic();

  // Navigate with language awareness
  navigateToPhase(ValidationPhase.COMPENSATION_ESTIMATE);
};
```

#### Compensation Estimate Phase

```typescript
<div className="flex justify-between">
  <BackButton useUniversalNav={true} useBackHistory={true} />
  <ContinueButton
    onClick={handleContinue}
    useUniversalNav={true}
    navigateToPhase={ValidationPhase.FLIGHT_DETAILS}
    disabled={!compensationAmount}
  />
</div>
```

#### Flight Details Phase

```typescript
const { navigateToPhase } = useUniversalNavigation();

const handleContinue = async () => {
  // Save original flights
  await saveOriginalFlights();

  // Update validation
  validation.setStepValidation(ValidationPhase.FLIGHT_DETAILS, true);

  // Navigate to next phase
  navigateToPhase(ValidationPhase.TRIP_EXPERIENCE);
};
```

#### Trip Experience Phase

```typescript
const { navigateToPhase } = useUniversalNavigation();

const handleContinue = async () => {
  const result = await evaluateeClaim();

  if (result.status === "accept") {
    navigateToPhase(ValidationPhase.CLAIM_SUCCESS);
  } else {
    navigateToPhase(ValidationPhase.CLAIM_REJECTED);
  }
};
```

## Advanced Usage

### Navigation with Options

```typescript
const { navigateToPhase, changeLanguage } = useUniversalNavigation();

// Navigate with specific options
navigateToPhase(ValidationPhase.AGREEMENT, {
  replace: true, // Use router.replace instead of router.push
  preserveQuery: true, // Keep current query parameters
  lang: "en", // Override current language
});

// Change language while preserving path
changeLanguage("de"); // Will navigate from /en/phases/flight-details to /de/phases/flight-details
```

### Custom URL Navigation

```typescript
const { navigateToUrl } = useUniversalNavigation();

// Navigate to custom URLs with language awareness
navigateToUrl("/contact-support"); // Becomes /de/contact-support or /en/contact-support
navigateToUrl("/phases/custom-step", { replace: true });
```

### Phase Detection and Utilities

```typescript
const { getCurrentPhase, getCurrentLanguage } = useUniversalNavigation();

// Get current state
const currentPhase = getCurrentPhase(); // Returns ValidationPhase enum
const currentLang = getCurrentLanguage(); // Returns 'en' | 'de'

// Use in conditional logic
if (currentPhase === ValidationPhase.TRIP_EXPERIENCE) {
  // Phase-specific logic
}
```

## Migration Checklist

### Phase Navigation Updates

- [ ] Initial Assessment (`/phases/initial-assessment`)
- [ ] Compensation Estimate (`/phases/compensation-estimate`)
- [ ] Flight Details (`/phases/flight-details`)
- [ ] Trip Experience (`/phases/trip-experience`)
- [ ] Claim Success (`/phases/claim-success`)
- [ ] Claim Rejected (`/phases/claim-rejected`)
- [ ] Agreement (`/phases/agreement`)
- [ ] Claim Submitted (`/phases/claim-submitted`)

### Component Updates

- [ ] Replace ContinueButton usage in all phases
- [ ] Replace BackButton usage in all phases
- [ ] Update LanguageSwitcher component
- [ ] Update PhaseNavigation component
- [ ] Update any custom navigation logic

### Testing

- [ ] Test forward navigation preserves language
- [ ] Test backward navigation preserves language
- [ ] Test language switching preserves current phase
- [ ] Test browser back button functionality
- [ ] Test deep linking with language prefixes
- [ ] Test edge cases (invalid phases, missing routes)

## Common Patterns

### Business Logic + Navigation Pattern

```typescript
const { navigateToNextPhase } = useUniversalNavigation();

const handleContinue = async () => {
  try {
    setIsLoading(true);

    // 1. Execute business logic
    await performValidation();
    await saveData();
    await updateStore();

    // 2. Navigate to next phase
    const currentPhase = getCurrentPhase();
    if (currentPhase) {
      navigateToNextPhase(currentPhase);
    }
  } catch (error) {
    console.error("Error:", error);
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Conditional Navigation Pattern

```typescript
const { navigateToPhase } = useUniversalNavigation();

const handleSubmit = async () => {
  const result = await processSubmission();

  // Navigate based on result
  switch (result.status) {
    case "success":
      navigateToPhase(ValidationPhase.CLAIM_SUCCESS);
      break;
    case "rejected":
      navigateToPhase(ValidationPhase.CLAIM_REJECTED);
      break;
    case "requires_agreement":
      navigateToPhase(ValidationPhase.AGREEMENT);
      break;
    default:
      // Stay on current phase or show error
      setError("Unknown status");
  }
};
```

### Error Handling Pattern

```typescript
const { navigateToPhase, goBack } = useUniversalNavigation();

const handleNavigation = async (targetPhase: ValidationPhase) => {
  try {
    navigateToPhase(targetPhase);
  } catch (error) {
    console.error("Navigation error:", error);

    // Fallback navigation
    goBack();
  }
};
```

## Benefits

1. **Consistency**: All navigation uses the same language-aware system
2. **Maintainability**: Centralized navigation logic reduces code duplication
3. **Type Safety**: TypeScript ensures valid phase transitions
4. **User Experience**: Language preferences are always preserved
5. **Developer Experience**: Simple API for complex navigation requirements
6. **Future-Proof**: Easy to extend with additional navigation features

## Troubleshooting

### Common Issues

1. **Language Lost on Navigation**

   - Ensure using `useUniversalNav={true}` in buttons
   - Check that phase routes are defined in `PHASE_ROUTES`

2. **Navigation Not Working**

   - Verify ValidationPhase enum values match those in navigation utils
   - Check console for navigation warnings/errors

3. **Back Button Issues**

   - Use `useBackHistory={true}` for automatic previous phase detection
   - Provide explicit `navigateToPhase` if custom back logic needed

4. **TypeScript Errors**
   - Ensure ValidationPhase imports are correct
   - Check that all phase routes are properly typed

This universal navigation system provides a robust foundation for language-aware navigation in your Next.js 15 application, ensuring users never lose their language preference when navigating between phases.
