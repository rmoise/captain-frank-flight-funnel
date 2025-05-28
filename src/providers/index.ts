// Export all providers for easy importing
export { default as StoreProvider } from './StoreProvider';
export { NavigationProvider } from './NavigationProvider.shared';
export { ExternalScriptsProvider } from './ExternalScriptsProvider';
export { LoadingProvider, useLoading } from './LoadingProvider';
export { default as ClientProviders } from './ClientProviders';

// For backwards compatibility
import { default as StoreProvider } from './StoreProvider';
import { NavigationProvider } from './NavigationProvider.shared';
import { ExternalScriptsProvider } from './ExternalScriptsProvider';
import { LoadingProvider } from './LoadingProvider';

// Named export for all providers
export const Providers = {
  StoreProvider,
  NavigationProvider,
  ExternalScriptsProvider,
  LoadingProvider
};

// Default export for backwards compatibility
export default Providers;
