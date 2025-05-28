import { Handler, HandlerEvent } from "@netlify/functions";
import { Airport } from "./types";

const API_BASE_URL =
  "https://secure.captain-frank.net/api/services/euflightclaim";

const handler: Handler = async (event: HandlerEvent) => {
  // Add CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const { term, lang } = event.queryStringParameters || {};

  // Validate term is at least 3 characters long
  if (!term || term.length < 3) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([]),
    };
  }

  try {
    // Don't manipulate the term, pass it as is
    const searchTerm = term.trim();

    const apiUrl = `${API_BASE_URL}/searchairportsbyterm?term=${encodeURIComponent(
      searchTerm
    )}${lang ? `&lang=${lang}` : ""}`;
    console.log("Making request to:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
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

      // NEW: Forward the actual error status and response body
      return {
        statusCode: response.status,
        headers,
        body: responseText, // Forward the original error body
      };
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("Parsed API response:", JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error("Failed to parse API response:", parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Invalid JSON response from API",
          details: responseText,
        }),
      };
    }

    // Simply pass through the response as is
    let airports = [];

    if (Array.isArray(result)) {
      airports = result;
    } else if (
      result &&
      typeof result === "object" &&
      result.data &&
      Array.isArray(result.data)
    ) {
      airports = result.data;
    } else if (result && typeof result === "object" && !Array.isArray(result)) {
      // If it's a single airport object, wrap it in an array
      airports = [result];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(airports),
    };
  } catch (error) {
    console.error("Error searching airports:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
