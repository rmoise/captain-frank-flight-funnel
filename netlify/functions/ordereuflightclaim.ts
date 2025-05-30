import { Handler, HandlerEvent } from "@netlify/functions";

const API_BASE_URL =
  "https://secure.captain-frank.net/api/services/euflightclaim";

// Map of English country names to German country names
const COUNTRY_NAME_MAP: Record<string, string> = {
  Germany: "Deutschland",
  Belgium: "Belgien",
  Bulgaria: "Bulgarien",
  Denmark: "Dänemark",
  Estonia: "Estland",
  Finland: "Finnland",
  France: "Frankreich",
  Greece: "Griechenland",
  Ireland: "Irland",
  Italy: "Italien",
  Croatia: "Kroatien",
  Latvia: "Lettland",
  Lithuania: "Litauen",
  Luxembourg: "Luxemburg",
  Malta: "Malta",
  Netherlands: "Niederlande",
  Austria: "Österreich",
  Poland: "Polen",
  Portugal: "Portugal",
  Romania: "Rumänien",
  Sweden: "Schweden",
  Slovakia: "Slowakei",
  Slovenia: "Slowenien",
  Spain: "Spanien",
  "Czech Republic": "Tschechien",
  Hungary: "Ungarn",
  Cyprus: "Zypern",
  "United Kingdom": "Großbritannien",
  Switzerland: "Schweiz",
  Norway: "Norwegen",
  Iceland: "Island",
  Liechtenstein: "Liechtenstein",
  Egypt: "Ägypten",
  Argentina: "Argentinien",
  Australia: "Australien",
  Brazil: "Brasilien",
  Chile: "Chile",
  China: "China",
  India: "Indien",
  Indonesia: "Indonesien",
  Israel: "Israel",
  Japan: "Japan",
  Canada: "Kanada",
  Colombia: "Kolumbien",
  "Republic of Korea": "Korea, Republik",
  Malaysia: "Malaysia",
  Mexico: "Mexiko",
  "New Zealand": "Neuseeland",
  Pakistan: "Pakistan",
  Philippines: "Philippinen",
  Russia: "Russland",
  "Saudi Arabia": "Saudi-Arabien",
  Singapore: "Singapur",
  "South Africa": "Südafrika",
  Thailand: "Thailand",
  Turkey: "Türkei",
  "United Arab Emirates": "Vereinigte Arabische Emirate",
  "United States": "Vereinigte Staaten",
  Vietnam: "Vietnam",
};

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Request body is required" }),
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    console.log("Received request body:", requestBody);

    // Validate required fields
    const requiredFields = [
      "journey_booked_flightids",
      "journey_fact_flightids",
      "information_received_at",
      "journey_booked_pnr",
      "journey_fact_type",
      "owner_salutation",
      "owner_firstname",
      "owner_lastname",
      "owner_street",
      "owner_place",
      "owner_city",
      "owner_country",
      "owner_email",
      "contract_signature",
      "contract_tac",
      "contract_dp",
    ];

    const missingFields = requiredFields.filter((field) => !requestBody[field]);
    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Missing required fields: ${missingFields.join(", ")}`,
          status: "error",
        }),
      };
    }

    // Validate journey_fact_type
    const validJourneyFactTypes = ["none", "self", "provided"];
    if (!validJourneyFactTypes.includes(requestBody.journey_fact_type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid journey_fact_type: ${
            requestBody.journey_fact_type
          }. Valid values are: ${validJourneyFactTypes.join(", ")}`,
          valid_values: validJourneyFactTypes,
          status: "error",
        }),
      };
    }

    // Validate owner_salutation
    if (!["herr", "frau"].includes(requestBody.owner_salutation)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid owner_salutation",
          valid_values: ["herr", "frau"],
          status: "error",
        }),
      };
    }

    // Ensure flight IDs are numbers
    const journey_booked_flightids =
      requestBody.journey_booked_flightids.map(Number);
    const journey_fact_flightids =
      requestBody.journey_fact_flightids.map(Number);

    // Handle country value - ensure it's in German
    let owner_country = requestBody.owner_country;
    // First check if it's already a German name
    const isGermanName =
      Object.values(COUNTRY_NAME_MAP).includes(owner_country);
    if (!isGermanName) {
      // If not a German name, try to find the German equivalent
      owner_country = COUNTRY_NAME_MAP[owner_country] || owner_country;
    }

    const apiUrl = `${API_BASE_URL}/ordereuflightclaim`;
    console.log("Making request to:", apiUrl);

    // Log evaluation state if available
    if (requestBody.guid || requestBody.recommendation_guid) {
      console.log("=== EVALUATION STATE ===");
      console.log("Evaluation GUID:", requestBody.guid);
      console.log("Recommendation GUID:", requestBody.recommendation_guid);
      console.log("=====================");
    }

    console.log("=== DETAILED REQUEST LOGGING ===");
    console.log("Marketing Status Details:", {
      rawValue: requestBody.arbeitsrecht_marketing_status,
      typeOfRaw: typeof requestBody.arbeitsrecht_marketing_status,
      rawValueString: String(requestBody.arbeitsrecht_marketing_status),
      isBoolean: typeof requestBody.arbeitsrecht_marketing_status === "boolean",
      finalValue:
        typeof requestBody.arbeitsrecht_marketing_status === "boolean"
          ? requestBody.arbeitsrecht_marketing_status
          : String(requestBody.arbeitsrecht_marketing_status).toLowerCase() ===
            "true",
      timestamp: new Date().toISOString(),
    });

    // Add this new logging section
    console.log("=== MARKETING STATUS TRANSFORMATION ===");
    console.log("Input Value:", {
      raw: requestBody.arbeitsrecht_marketing_status,
      type: typeof requestBody.arbeitsrecht_marketing_status,
      stringified: JSON.stringify(requestBody.arbeitsrecht_marketing_status),
      fromHubSpot: true,
      isTrue:
        typeof requestBody.arbeitsrecht_marketing_status === "boolean"
          ? requestBody.arbeitsrecht_marketing_status
          : String(requestBody.arbeitsrecht_marketing_status).toLowerCase() ===
            "true",
    });

    const marketingStatus =
      typeof requestBody.arbeitsrecht_marketing_status === "boolean"
        ? requestBody.arbeitsrecht_marketing_status
        : String(requestBody.arbeitsrecht_marketing_status).toLowerCase() ===
          "true";

    console.log("Marketing Status:", {
      inputValue: requestBody.arbeitsrecht_marketing_status,
      inputType: typeof requestBody.arbeitsrecht_marketing_status,
      finalValue: marketingStatus,
      finalType: typeof marketingStatus,
      timestamp: new Date().toISOString(),
    });

    console.log("Journey Booked Flight IDs:", journey_booked_flightids);
    console.log("Journey Fact Flight IDs:", journey_fact_flightids);
    console.log(
      "Journey Fact Type:",
      requestBody.journey_fact_type,
      "(must be one of:",
      validJourneyFactTypes.join(", "),
      ")"
    );
    console.log(
      "Information Received At:",
      requestBody.information_received_at
    );
    console.log("PNR:", requestBody.journey_booked_pnr);
    console.log("================================");

    const apiRequestBody = {
      journey_booked_flightids,
      journey_fact_flightids,
      information_received_at: requestBody.information_received_at,
      journey_booked_pnr: requestBody.journey_booked_pnr,
      journey_fact_type: requestBody.journey_fact_type,
      owner_salutation: requestBody.owner_salutation,
      owner_firstname: requestBody.owner_firstname,
      owner_lastname: requestBody.owner_lastname,
      owner_street: requestBody.owner_street,
      owner_place: requestBody.owner_place,
      owner_city: requestBody.owner_city,
      owner_country,
      owner_email: requestBody.owner_email,
      owner_phone: requestBody.owner_phone || "0000000000",
      owner_marketable_status: marketingStatus,
      contract_signature: requestBody.contract_signature,
      contract_tac: Boolean(requestBody.contract_tac),
      contract_dp: Boolean(requestBody.contract_dp),
      lang: "en",
    };

    console.log("API request body:", apiRequestBody);

    // Add detailed marketing status logging
    console.log("=== FINAL MARKETING STATUS CHECK ===");
    console.log("Marketing Status:", {
      finalValue: apiRequestBody.owner_marketable_status,
      type: typeof apiRequestBody.owner_marketable_status,
      stringified: JSON.stringify(apiRequestBody.owner_marketable_status),
      timestamp: new Date().toISOString(),
    });
    console.log("=================================");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(apiRequestBody),
    });

    const responseText = await response.text();
    console.log("=== DETAILED API RESPONSE LOGGING ===");
    console.log("Response Status:", response.status);
    console.log(
      "Response Headers:",
      Object.fromEntries(response.headers.entries())
    );
    console.log("Raw Response Text:", responseText);
    console.log("================================");

    if (!response.ok) {
      let errorMessage = `API responded with status ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        console.log("Parsed Error Data:", errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse success response:", e);
      throw new Error("Invalid response format from API");
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error ordering EU flight claim:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Internal Server Error",
        details: error instanceof Error ? error.stack : undefined,
      }),
    };
  }
};

export { handler };
