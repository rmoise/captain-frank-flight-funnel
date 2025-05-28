import { NextResponse } from "next/server";
import { API_BASE_URL, standardOptionsHandler } from "../api-config";

// Define config options directly in this file
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "edge";

interface Airport {
  iata_code?: string;
  code?: string;
  name?: string;
  airport?: string;
  city?: string;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
}

interface FormattedAirport {
  iata_code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

interface ApiResponse {
  data: FormattedAirport[];
  status: "success" | "error";
  message?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get("term")?.toUpperCase();
    const lang = searchParams.get("lang") || "de";

    console.log("Airport search request:", { term, lang });

    // Return empty results for very short terms
    if (!term || term.length < 2) {
      return NextResponse.json<ApiResponse>(
        {
          data: [],
          status: "success",
          message: "Please enter at least 2 characters",
        },
        { status: 200 } // Return 200 instead of 400 to avoid error state
      );
    }

    // Make request to Captain Frank API
    const apiUrl = `${API_BASE_URL}/searchairportsbyterm?${new URLSearchParams({
      term: term.trim(),
      lang,
    })}`;
    console.log("Calling Captain Frank API:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }, // Disable caching
    });

    if (!response.ok) {
      console.error("API request failed:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });

      // No more mock data - just return the error
      const errorText = await response.text();
      console.error("Error response text:", errorText);

      return NextResponse.json<ApiResponse>({
        data: [],
        status: "error",
        message: `API request failed with status ${response.status}`,
      });
    }

    const responseText = await response.text();
    console.log("Raw API response:", responseText);

    let data: Airport | Airport[] | { data: Airport[] };
    try {
      data = JSON.parse(responseText);
      console.log("Parsed API response:", data);
    } catch (parseError) {
      console.error("Failed to parse API response:", parseError);
      return NextResponse.json<ApiResponse>({
        data: [],
        status: "error",
        message: "Failed to parse API response",
      });
    }

    // Format the response - handle both array and object responses
    let airports: Airport[] = [];
    if (Array.isArray(data)) {
      airports = data;
    } else if ("data" in data && Array.isArray(data.data)) {
      airports = data.data;
    } else if (typeof data === "object" && data !== null) {
      // If it's a single airport object, wrap it in an array
      airports = [data as Airport];
    }

    // Transform the data to match the expected format
    const formattedAirports: FormattedAirport[] = airports.map((airport) => ({
      iata_code: airport.iata_code || airport.code || "",
      name: airport.name || airport.airport || "",
      city: airport.city || "",
      lat: airport.lat || airport.latitude || 0,
      lng: airport.lng || airport.longitude || 0,
    }));

    // Simple sort - prioritize exact IATA code matches
    if (term.length === 3 && /^[A-Z]{3}$/.test(term)) {
      formattedAirports.sort((a, b) => {
        if (a.iata_code === term) return -1;
        if (b.iata_code === term) return 1;
        return 0;
      });
    }

    return NextResponse.json<ApiResponse>({
      data: formattedAirports,
      status: "success",
      message: formattedAirports.length === 0 ? "No airports found" : undefined,
    });
  } catch (error) {
    console.error("Airport search error:", error);
    return NextResponse.json<ApiResponse>({
      data: [],
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to search airports",
    });
  }
}

export async function OPTIONS() {
  return standardOptionsHandler();
}
