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

  const { from_iata, to_iata, date, flight_number } =
    event.queryStringParameters || {};

  // Log incoming parameters
  console.log("Search parameters:", {
    from_iata,
    to_iata,
    date,
    flight_number,
  });

  // Validate required parameters
  if (!from_iata || !to_iata || !date) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing required parameters",
        required: ["from_iata", "to_iata", "date"],
        received: event.queryStringParameters,
      }),
    };
  }

  try {
    // Build API URL with optional flight_number and add lang parameter
    let apiUrl = `${API_BASE_URL}/searchflightsbyfromiatatoiatadatenumber?from_iata=${from_iata}&to_iata=${to_iata}&flight_date=${date}`;

    // Add language parameter if provided, otherwise default to 'en'
    const lang = event.queryStringParameters?.lang || "en";
    apiUrl += `&lang=${lang}`;

    if (flight_number) {
      apiUrl += `&flight_number=${flight_number}`;
    }

    console.log("Making request to:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", response.status);
    const responseText = await response.text();
    console.log("Raw API response:", responseText);

    if (!response.ok) {
      console.error("API error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `API Error: ${response.status} ${response.statusText}`,
          details: responseText,
        }),
      };
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("Parsed response:", JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error("Failed to parse API response:", parseError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Invalid JSON response from API",
          details: responseText,
        }),
      };
    }

    // Extract flights from response data
    const flights: Flight[] = Array.isArray(result.data) ? result.data : [];

    // If no flights found, return a more informative response
    if (flights.length === 0) {
      console.log("No flights found for the given criteria");
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [],
          message:
            "No flights found for the given criteria. This could be because the route is not available, the date is outside the searchable range, or there are no scheduled flights for this route on the specified date.",
          searchParams: {
            from_iata,
            to_iata,
            date,
            flight_number,
          },
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: flights,
        message: "Flights found successfully",
      }),
    };
  } catch (error) {
    console.error("Error searching flights:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
