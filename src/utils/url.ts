export const getLanguageAwareUrl = (url: string, lang: string): string => {
  // Remove any leading slashes
  const cleanUrl = url.replace(/^\/+/, "");

  // Construct the language-aware URL
  return `/${lang}/${cleanUrl}`;
};
