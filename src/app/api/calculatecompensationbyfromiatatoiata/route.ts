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

    // Call Netlify function with proper URL resolution
    // In production, we need to construct the full URL to the Netlify function
    const getNetlifyFunctionUrl = () => {
      // Get the host from the request
      const host = request.headers.get('host');
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      
      if (host) {
        return `${protocol}://${host}/.netlify/functions/calculateCompensation`;
      }
      
      // Fallback to production URL if we can't determine host
      return 'https://captainfrankfunnel.netlify.app/.netlify/functions/calculateCompensation';
    };

    const netlifyFunctionUrl = getNetlifyFunctionUrl();
    const netlifyUrl = `${netlifyFunctionUrl}?from_iata=${from_iata}&to_iata=${to_iata}`;
    
    console.log("Calling Netlify function:", netlifyUrl);

    const response = await fetch(netlifyUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log("Netlify function response status:", response.status);

    if (!response.ok) {
      console.error("Netlify function call failed:", {
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
    console.log("Raw Netlify function response text:", rawResponseText);

    // Then parse it
    let responseData;
    try {
      responseData = JSON.parse(rawResponseText);
      console.log("Parsed Netlify function response:", responseData);
    } catch (parseError) {
      console.error("Failed to parse Netlify function response:", parseError);
      return NextResponse.json({
        error: "Failed to parse compensation data",
      }, { status: 500 });
    }

    // Netlify function returns { amount: number, currency: "EUR" }
    if (responseData && typeof responseData.amount === "number") {
      console.log("Successfully extracted compensation amount:", responseData.amount);

      // Return the response in the format the frontend expects
      console.log("Returning compensation amount to frontend:", responseData.amount);
      return NextResponse.json({ amount: responseData.amount });
    } else {
      console.error(
        "Invalid response format - missing amount field:",
        responseData
      );

      // If we don't have a valid amount, return an error
      return NextResponse.json({
        error: "Invalid compensation data format",
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
