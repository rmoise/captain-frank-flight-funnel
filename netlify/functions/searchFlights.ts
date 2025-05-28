import { Handler, HandlerEvent } from "@netlify/functions";
import { Flight } from "./types";

const API_BASE_URL =
  "https://secure.captain-frank.net/api/services/euflightclaim";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  console.log("[searchFlights.ts] === Function Start ===");
  console.log(
    "[searchFlights.ts] Raw query string parameters:",
    event.queryStringParameters
  );

  const { from_iata, to_iata, date, flight_date, flight_number } =
    event.queryStringParameters || {};

  const dateInput = date || flight_date;
  console.log("[searchFlights.ts] Received 'dateInput':", dateInput);

  let finalFormattedDate = "";

  if (dateInput && typeof dateInput === "string") {
    if (dateInput.includes("T")) {
      finalFormattedDate = dateInput.split("T")[0];
      console.log(
        "[searchFlights.ts] Date included 'T', split to:",
        finalFormattedDate
      );
    } else if (dateInput.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
      finalFormattedDate = dateInput; // Already in YYYY-MM-DD
      console.log(
        "[searchFlights.ts] Date already YYYY-MM-DD:",
        finalFormattedDate
      );
    } else {
      console.warn(
        "[searchFlights.ts] Date format not directly YYYY-MM-DD or ISO with 'T'. Original:",
        dateInput
      );
      // Attempt to parse as a fallback
      try {
        const parsed = new Date(dateInput);
        if (!isNaN(parsed.getTime())) {
          finalFormattedDate = parsed.toISOString().split("T")[0];
          console.log(
            "[searchFlights.ts] Fallback parsing successful:",
            finalFormattedDate
          );
        } else {
          finalFormattedDate = dateInput; // Use original if unparseable
        }
      } catch (e) {
        finalFormattedDate = dateInput; // Use original on error
      }
    }
  } else {
    console.error(
      "[searchFlights.ts] 'dateInput' is not a string or is undefined. Value:",
      dateInput
    );
  }

  if (!finalFormattedDate || !finalFormattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.error(
      "[searchFlights.ts] CRITICAL: Date formatting failed. Original 'dateInput':",
      dateInput,
      "Result 'finalFormattedDate':",
      finalFormattedDate
    );
    // If formatting completely failed, we might not want to proceed or use a known invalid date for the API
    // For now, let it proceed so the error is visible in the API call parameters
  }

  console.log(
    "[searchFlights.ts] FINAL FORMATTED DATE for API call:",
    finalFormattedDate
  );

  if (!from_iata || !to_iata || !finalFormattedDate) {
    // Check finalFormattedDate now
    console.error(
      "[searchFlights.ts] Missing required parameters after date processing."
    );
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing required parameters",
        required: ["from_iata", "to_iata", "date or flight_date"],
        received: event.queryStringParameters,
      }),
    };
  }

  try {
    let apiUrl = `${API_BASE_URL}/searchflightsbyfromiatatoiatadatenumber?from_iata=${from_iata}&to_iata=${to_iata}&flight_date=${finalFormattedDate}`;
    const lang = event.queryStringParameters?.lang || "en";
    apiUrl += `&lang=${lang}`;
    if (flight_number) {
      apiUrl += `&flight_number=${flight_number}`;
    }
    console.log("[searchFlights.ts] Constructing API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log(
      "[searchFlights.ts] Backend API response status:",
      response.status
    );
    const responseText = await response.text();
    console.log(
      "[searchFlights.ts] Raw Backend API response text:",
      responseText
    );

    if (!response.ok) {
      console.error("[searchFlights.ts] Backend API error:", {
        status: response.status,
        text: responseText,
      });
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `Backend API Error: ${response.status}`,
          details: responseText,
        }),
      };
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "[searchFlights.ts] Failed to parse Backend API JSON response:",
        parseError
      );
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Invalid JSON response from Backend API",
          details: responseText,
        }),
      };
    }

    console.log("[searchFlights.ts] Parsed Backend API response:", result);

    const flights: Flight[] = Array.isArray(result.data) ? result.data : [];
    if (flights.length === 0) {
      console.log("[searchFlights.ts] No flights found by Backend API.");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [],
          message: result.message || "No flights found for the given criteria.",
          searchParams: {
            from_iata,
            to_iata,
            date: finalFormattedDate,
            flight_number: flight_number || null,
          },
        }),
      };
    }

    console.log(`[searchFlights.ts] Found ${flights.length} flights.`);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: flights,
        searchParams: {
          from_iata,
          to_iata,
          date: finalFormattedDate,
          flight_number: flight_number || null,
        },
      }),
    };
  } catch (error: any) {
    console.error(
      "[searchFlights.ts] CATCH BLOCK Error searching flights:",
      error
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error in Netlify Function",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
