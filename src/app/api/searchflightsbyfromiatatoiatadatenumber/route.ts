import { NextResponse } from "next/server";
import { API_BASE_URL, standardOptionsHandler } from "../api-config";

// Define config options directly in this file
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "edge";

async function searchFlightsForDate(params: {
  from_iata: string;
  to_iata: string;
  flight_date: string;
  flight_number?: string;
  lang: string;
}) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.set(key, value);
  });

  const apiUrl = `${API_BASE_URL}/searchflightsbyfromiatatoiatadatenumber?${queryParams}`;
  console.log("Making API request to:", apiUrl);
  console.log("Search parameters:", params);

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  const responseText = await response.text();
  console.log(`API Response for ${params.flight_date}:`, responseText);

  if (!response.ok) {
    console.error("API request failed:", {
      status: response.status,
      statusText: response.statusText,
      url: apiUrl,
      response: responseText,
    });
    return null;
  }

  try {
    const data = JSON.parse(responseText);
    console.log("Parsed flight data:", data);
    return data;
  } catch (error) {
    console.error("Failed to parse response:", error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from_iata = searchParams.get("from_iata")?.toUpperCase();
    const to_iata = searchParams.get("to_iata")?.toUpperCase();
    const date = searchParams.get("date");
    const flight_number = searchParams.get("flight_number")?.toUpperCase();
    const lang = searchParams.get("lang") || "en";

    console.log("Flight search request:", {
      from_iata,
      to_iata,
      date,
      flight_number,
      lang,
      url: request.url,
    });

    if (!from_iata || !to_iata || !date) {
      console.error("Missing required parameters:", {
        from_iata,
        to_iata,
        date,
      });
      return NextResponse.json({
        data: [],
        status: "error",
        message: "Missing required parameters",
      });
    }

    // Try multiple dates around the requested date
    const searchDate = new Date(date);
    const dates = [
      searchDate.toISOString().split("T")[0], // Original date
      new Date(
        searchDate.getFullYear(),
        searchDate.getMonth(),
        searchDate.getDate() - 1
      )
        .toISOString()
        .split("T")[0], // Day before
      new Date(
        searchDate.getFullYear(),
        searchDate.getMonth(),
        searchDate.getDate() + 1
      )
        .toISOString()
        .split("T")[0], // Day after
    ];

    console.log("Searching for dates:", dates);

    let flights = [];
    for (const testDate of dates) {
      console.log(`Trying date: ${testDate}`);
      const result = await searchFlightsForDate({
        from_iata,
        to_iata,
        flight_date: testDate,
        flight_number,
        lang,
      });

      if (result && (Array.isArray(result.data) || Array.isArray(result))) {
        const flightData = Array.isArray(result.data) ? result.data : result;
        console.log(`Found ${flightData.length} flights for date ${testDate}`);
        if (flightData.length > 0) {
          flights = flightData;
          break;
        }
      } else {
        console.log(`No flights found for date ${testDate}`);
      }
    }

    console.log("Final flights result:", {
      count: flights.length,
      flights: flights,
    });

    return NextResponse.json({
      data: flights,
      status: "success",
      message:
        flights.length === 0
          ? "No flights found for the selected dates"
          : undefined,
    });
  } catch (error) {
    console.error("Flight search error:", error);
    return NextResponse.json({
      data: [],
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to search flights",
      debug: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return standardOptionsHandler();
}
