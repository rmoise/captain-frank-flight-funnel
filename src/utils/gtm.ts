interface DataLayerEvent {
  event: string;
  gclid: string | null;
  dlv_provision: number | null;
  dlv_product: string;
  dlv_currency: string;
  step_position: number | null;
}

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
  }
}

// Helper: Retrieve GCLID from URL or local storage
export function getGclid() {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const gclidFromUrl = urlParams.get('gclid');
  if (gclidFromUrl) {
    // Store GCLID in local storage for reuse
    localStorage.setItem('gclid', gclidFromUrl);
    return gclidFromUrl;
  }
  // Return stored GCLID if available
  return localStorage.getItem('gclid');
}

// Push data to the data layer dynamically
export function pushToDataLayer({
  dlv_provision = null,
  step_position = null,
}: {
  dlv_provision?: number | null;
  step_position?: number | null;
}) {
  if (typeof window === 'undefined') return;

  const gclid = getGclid();

  const eventData: DataLayerEvent = {
    event: 'conversion_complete', // Event to trigger in GTM
    gclid: gclid, // Google Click ID
    dlv_provision: dlv_provision, // Provision (e.g., type of service)
    dlv_product: 'euflight', // Static product name
    dlv_currency: 'EUR', // Static currency value
    step_position: step_position, // Position in the funnel or process
  };

  // Push the structured data to the data layer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(eventData);
}
