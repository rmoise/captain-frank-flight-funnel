import { NextResponse } from "next/server";
import { standardOptionsHandler } from "../api-config";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "edge";

interface CompensationResponse {
  status: "success" | "error";
  data?: number;
  message?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from_iata = searchParams.get("from_iata")?.toUpperCase();
    const to_iata = searchParams.get("to_iata")?.toUpperCase();

    console.log("=== Calculate Compensation API Route Start ===");
    console.log("Request parameters:", {
      from_iata,
      to_iata,
      url: request.url,
    });

    if (!from_iata || !to_iata) {
      console.error("Missing required parameters");
      return NextResponse.json(
        { error: "Missing required parameters (from_iata or to_iata)" },
        { status: 400 }
      );
    }

    if (!/^[A-Z]{3}$/.test(from_iata) || !/^[A-Z]{3}$/.test(to_iata)) {
      console.error("Invalid IATA codes:", { from_iata, to_iata });
      return NextResponse.json(
        { error: "Invalid IATA codes provided" },
        { status: 400 }
      );
    }

    // Simplified approach - directly call the external API
    // This avoids the Netlify function complexity and potential edge runtime issues
    const directApiUrl = `https://secure.captain-frank.net/api/services/euflightclaim/calculatecompensationbyfromiatatoiata?from_iata=${from_iata}&to_iata=${to_iata}`;
    
    console.log("=== Attempting direct API call ===");
    console.log("Direct API URL:", directApiUrl);

    try {
      const response = await fetch(directApiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("External API response status:", response.status);
      console.log("External API response headers:", Object.fromEntries(response.headers.entries()));
      
      // Log response URL to check if request worked
      console.log("Actual response URL:", response.url);

      if (!response.ok) {
      console.error("External API call failed:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });

      // Try to get error text if possible
      let errorText = "";
      try {
        errorText = await response.text();
        console.error("Error response body:", errorText);
      } catch (e) {
        console.error("Could not get error text:", e);
      }

      // Return a more descriptive error
      return NextResponse.json({
        error: `Compensation calculation failed with status ${
          response.status
        }${errorText ? ": " + errorText : ""}`,
      }, { status: 500 });
    }

    // Get the raw response text first for debugging
    const rawResponseText = await response.text();
    console.log("Raw external API response text:", rawResponseText);

    // Then parse it
    let responseData;
    try {
      responseData = JSON.parse(rawResponseText);
      console.log("Parsed external API response:", responseData);
    } catch (parseError) {
      console.error("Failed to parse external API response:", parseError);
      return NextResponse.json({
        error: "Failed to parse compensation data",
      }, { status: 500 });
    }

    // External API returns { data: number }
    if (responseData && typeof responseData.data === "number") {
      console.log("Successfully extracted compensation amount:", responseData.data);

      // Return the response in the format the frontend expects
      console.log("Returning compensation amount to frontend:", responseData.data);
      return NextResponse.json({ amount: responseData.data });
    } else {
      console.error(
        "Invalid response format - missing data field:",
        responseData
      );

      // If we don't have a valid amount, return an error
      return NextResponse.json({
        error: "Invalid compensation data format",
      }, { status: 500 });
    }
    } catch (fetchError) {
      console.error("Error calling external API:", fetchError);
      return NextResponse.json({
        error: fetchError instanceof Error ? fetchError.message : "Failed to call external API",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error calculating compensation:", error);
    return NextResponse.json({
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return standardOptionsHandler();
}
