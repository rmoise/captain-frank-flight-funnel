/**
 * Utils for managing Contact ID across different storage types
 * Provides consistent access and redundancy for this critical identifier
 */

// Storage keys for Contact ID
const SESSION_STORAGE_KEY = "hubspot_contact_id";
const LOCAL_STORAGE_KEY = "hubspot_contact_id";
const DEBUG_PREFIX = "[ContactID]";

// Type for debug info
interface ContactIdDebug {
  timestamp: string;
  sessionAvailable: boolean;
  localAvailable: boolean;
  initialUrl: string;
  sessionValue?: string | null;
  localValue?: string | null;
  sessionError?: string;
  localError?: string;
  restoredToSession?: boolean;
  restoreError?: string;
  verified?: {
    session: boolean;
    local: boolean;
  };
}

/**
 * Gets the HubSpot Contact ID from storage with fallback mechanism
 * Checks both sessionStorage and localStorage
 * @param {boolean} detailed - Whether to return detailed debug info
 * @returns {string|null|{contactId: string|null, source: string, debug: ContactIdDebug}} Contact ID or detailed object
 */
export function getContactId(
  detailed = false
):
  | string
  | null
  | { contactId: string | null; source: string; debug: ContactIdDebug } {
  if (typeof window === "undefined") {
    console.log(`${DEBUG_PREFIX} getContactId called server-side`);
    return detailed
      ? {
          contactId: null,
          source: "server",
          debug: {
            timestamp: new Date().toISOString(),
            sessionAvailable: false,
            localAvailable: false,
            initialUrl: "",
          },
        }
      : null;
  }

  // Debug info
  const debug: ContactIdDebug = {
    timestamp: new Date().toISOString(),
    sessionAvailable: !!sessionStorage,
    localAvailable: !!localStorage,
    initialUrl: window.location.href,
  };

  // Try sessionStorage first
  let contactId: string | null = null;
  let source = "none";

  try {
    contactId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (contactId) {
      console.log(
        `${DEBUG_PREFIX} Retrieved Contact ID from sessionStorage:`,
        contactId
      );
      source = "sessionStorage";
      debug.sessionValue = contactId;
    } else {
      console.log(`${DEBUG_PREFIX} Contact ID not found in sessionStorage`);
      debug.sessionValue = null;
    }
  } catch (err) {
    console.error(`${DEBUG_PREFIX} Error accessing sessionStorage:`, err);
    debug.sessionError = err instanceof Error ? err.message : String(err);
  }

  // If not in sessionStorage, try localStorage
  if (!contactId) {
    try {
      contactId = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (contactId) {
        console.log(
          `${DEBUG_PREFIX} Recovered Contact ID from localStorage:`,
          contactId
        );
        source = "localStorage";
        debug.localValue = contactId;

        // If found in localStorage, restore to sessionStorage
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, contactId);
          console.log(`${DEBUG_PREFIX} Restored Contact ID to sessionStorage`);
          debug.restoredToSession = true;
        } catch (err) {
          console.error(
            `${DEBUG_PREFIX} Failed to restore Contact ID to sessionStorage:`,
            err
          );
          debug.restoredToSession = false;
          debug.restoreError = err instanceof Error ? err.message : String(err);
        }
      } else {
        console.log(
          `${DEBUG_PREFIX} Contact ID not found in both sessionStorage and localStorage`
        );
        debug.localValue = null;
      }
    } catch (err) {
      console.error(`${DEBUG_PREFIX} Error accessing localStorage:`, err);
      debug.localError = err instanceof Error ? err.message : String(err);
    }
  }

  if (detailed) {
    return { contactId, source, debug };
  }

  return contactId;
}

/**
 * Saves Contact ID to both sessionStorage and localStorage for redundancy
 * @param {string} contactId - The contact ID to save
 * @param {boolean} logDetails - Whether to log verbose details
 * @returns {boolean} Success status
 */
export function saveContactId(contactId: string, logDetails = false): boolean {
  if (typeof window === "undefined" || !contactId) {
    console.log(
      `${DEBUG_PREFIX} saveContactId called server-side or with empty ID`
    );
    return false;
  }

  const debug: ContactIdDebug = {
    timestamp: new Date().toISOString(),
    sessionAvailable: !!sessionStorage,
    localAvailable: !!localStorage,
    initialUrl: window.location.href,
  };

  console.log(`${DEBUG_PREFIX} Saving Contact ID to storage:`, contactId);

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, contactId);
    debug.sessionValue = contactId;
    console.log(`${DEBUG_PREFIX} Saved to sessionStorage successfully`);
  } catch (err) {
    console.error(`${DEBUG_PREFIX} Failed to save to sessionStorage:`, err);
    debug.sessionError = err instanceof Error ? err.message : String(err);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, contactId);
    debug.localValue = contactId;
    console.log(`${DEBUG_PREFIX} Saved to localStorage successfully`);
  } catch (err) {
    console.error(`${DEBUG_PREFIX} Failed to save to localStorage:`, err);
    debug.localError = err instanceof Error ? err.message : String(err);
  }

  // Verify save was successful
  const verifiedSession =
    sessionStorage.getItem(SESSION_STORAGE_KEY) === contactId;
  const verifiedLocal = localStorage.getItem(LOCAL_STORAGE_KEY) === contactId;
  debug.verified = { session: verifiedSession, local: verifiedLocal };

  if (logDetails) {
    console.log(`${DEBUG_PREFIX} Save details:`, debug);
  }

  return verifiedSession || verifiedLocal;
}

/**
 * Clears Contact ID from all storage
 */
export function clearContactId(): void {
  if (typeof window === "undefined") {
    console.log(`${DEBUG_PREFIX} clearContactId called server-side`);
    return;
  }

  console.log(`${DEBUG_PREFIX} Clearing Contact ID from all storage`);

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.log(`${DEBUG_PREFIX} Cleared from sessionStorage`);
  } catch (err) {
    console.error(`${DEBUG_PREFIX} Error clearing from sessionStorage:`, err);
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log(`${DEBUG_PREFIX} Cleared from localStorage`);
  } catch (err) {
    console.error(`${DEBUG_PREFIX} Error clearing from localStorage:`, err);
  }
}

/**
 * Attempts to verify or recover the Contact ID using available sources
 * @returns {string|null} Contact ID if recovered, null otherwise
 */
export function verifyContactId(): string | null {
  const result = getContactId(true) as {
    contactId: string | null;
    source: string;
    debug: ContactIdDebug;
  };

  if (result.contactId) {
    console.log(
      `${DEBUG_PREFIX} Contact ID verified from ${result.source}:`,
      result.contactId
    );
    return result.contactId;
  }

  console.log(`${DEBUG_PREFIX} Contact ID not found in any storage`);
  return null;
}

/**
 * Creates a new Contact ID if one doesn't exist
 * @returns {string} The existing or newly created Contact ID
 */
export function ensureContactId(): string {
  // First try to get existing Contact ID
  const existingId = verifyContactId();

  if (existingId) {
    console.log(`${DEBUG_PREFIX} Using existing Contact ID:`, existingId);
    return existingId;
  }

  // Return empty string instead of creating a fallback ID
  // This will cause the contact creation process in the initial assessment page
  // to create a real contact ID by calling the HubSpot API
  console.log(
    `${DEBUG_PREFIX} No Contact ID found and not creating a fallback`
  );
  return "";
}

/**
 * Check if Contact ID exists before navigation
 * @returns {boolean} Whether the Contact ID exists
 */
export function checkContactIdBeforeNavigation(): boolean {
  const contactId = getContactId();
  if (!contactId) {
    console.error(
      `${DEBUG_PREFIX} CRITICAL: Attempting to navigate without a Contact ID!`
    );
    return false;
  }
  console.log(
    `${DEBUG_PREFIX} Contact ID verified before navigation:`,
    contactId
  );
  return true;
}
