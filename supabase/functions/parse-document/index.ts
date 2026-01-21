import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
type LanguageRegion = "rs" | "ba" | "hr";
type Currency = "EUR" | "KM" | "RSD";

interface ParseDocumentRequest {
  import_id: string;
  file_url: string; // Signed URL
  organization_id: string;
  currency: Currency;
  margin_percent?: number;
  language_region: LanguageRegion;
}

// ============================================
// PROMPTS (copied from src/lib/prompts/document-parse-prompt.ts)
// ============================================

const LANGUAGE_OUTPUT_INSTRUCTIONS = {
  rs: {
    instruction:
      'ALWAYS output all user-facing text (names, descriptions, notes, warnings) in Serbian (Latin script, ekavica dialect). TRANSLATE from source language if needed. Use Serbian terminology: cena, noćenje, polupansion, deca, smeštaj, prevoz, doplata, upozorenje, besplatno. Example: "Djeca" → "Deca", "cijena" → "cena", "dijete" → "dete", "predviđeni" → "predviđeni".',
  },
  ba: {
    instruction:
      "Output all user-facing text (names, descriptions, notes) in Bosnian (Latin script). Use Bosnian terminology: cijena, nocenje, polupansion, djeca, smjestaj, prijevoz, doplata.",
  },
  hr: {
    instruction:
      "Output all user-facing text (names, descriptions, notes) in Croatian (Latin script). Use Croatian terminology: cijena, nocenje, polupansion, djeca, smjestaj, prijevoz, nadoplata.",
  },
} as const;

function getSystemPrompt(languageRegion: LanguageRegion = "rs"): string {
  const langName =
    languageRegion === "rs"
      ? "Serbian"
      : languageRegion === "ba"
        ? "Bosnian"
        : "Croatian";

  return `You are an expert parser for travel agency documents from the Balkan region (Serbia, Bosnia and Herzegovina, Croatia).

Specialization:
- Hotel price lists with complex children discount rules
- Package deals with transport
- Seasonal prices with date intervals
- Supplements, taxes, and cancellation policies

Your output is EXCLUSIVELY valid JSON without any comments or explanations outside the JSON structure.

Output language for user-facing text: ${langName}`;
}

function getDocumentParsePrompt(languageRegion: LanguageRegion = "rs"): string {
  const langConfig = LANGUAGE_OUTPUT_INSTRUCTIONS[languageRegion];

  return `You are an expert AI assistant specialized in parsing travel agency documents from the Balkan region (Serbia, Bosnia and Herzegovina, Croatia).

## OUTPUT LANGUAGE
${langConfig.instruction}
- JSON structure keys remain in English (e.g., "hotel_name", "price_type")
- Values like names, descriptions, and notes should be in the target language
- Preserve original document text in source_text fields exactly as written

---

## TASK

Parse this document and extract ALL pricing information, conditions, and rules.

Return JSON with the structures described below. **ONLY INCLUDE SECTIONS FOR WHICH YOU FIND DATA.**

---

## CRITICAL PARSING RULES

### 1. PRICE TYPE (MOST IMPORTANT!)
Carefully determine if the price is:
- \`per_person_per_night\` - per person per DAY/NIGHT (e.g., "42 EUR per person per day")
- \`per_person_per_stay\` - per person for the ENTIRE STAY (e.g., "559 EUR" for 7 nights)

**Examples from real documents:**
- Pearl Beach: "Cijene su date po osobi i po danu" (Prices are per person per day) -> per_person_per_night
- Albania packages with 7-day intervals and prices like 559+ -> per_person_per_stay

### 2. CHILDREN POLICIES (CRITICAL - EXTRACT AGES!)
Extract EVERY rule related to children. **ALWAYS extract age_from and age_to as numbers.**

**IMPORTANT: Parse age ranges from text:**
- "Djeca 0-2 godine" → age_from: 0, age_to: 2 (or 2.99)
- "Deca od 2 do 12 godina" → age_from: 2, age_to: 12 (or 11.99)
- "Children up to 2 years" → age_from: 0, age_to: 2
- "Kids 3-11" → age_from: 3, age_to: 11 (or 11.99)
- If age not specified, use reasonable defaults: age_from: 0, age_to: 17.99

**Never leave age_from or age_to as null/undefined. Always extract or infer ages.**

Pay attention to complex conditions:
- Number of adults in room: "If 1 adult stays with 1 child in the room"
- Child position: "Third child", "Fourth person is a child"
- Bed type: "on separate bed", "on shared bed", "free on shared bed"
- Age ranges: be precise (0-2.99, 3-11.99, 0-5.99, 6-11.99)
- Specific rooms: "If in Spic room 1/3 there are 2 adults..."

### 3. SUPPLEMENTS
Extract ALL optional and mandatory supplements:
- Sea view: often per person per day
- Single room: often a percentage (70%)
- Baby cot: usually fixed price per day
- Single use: supplement for one person in double room

### 4. MANDATORY FEES
These are costs NOT included in the package price:
- Tourist tax: usually different prices by age
- Travel insurance (PZO): may vary by age (over 60 years higher)
- Destination taxes

### 5. TRANSPORT
If transport price list exists:
- Distinguish "with package" vs "without package" (standalone) pricing
- Extract all departure cities
- Prices for children and adults
- Age limits for children (often 0-3.99 free, 4-11.99 reduced)

### 6. ROOM DETAILS
Extract physical characteristics and WARNINGS:
- Square meters
- Distance from beach/sea
- Bed configuration
- **CRITICAL**: Warnings like "Not suitable for elderly - no elevator"

### 6.5. PRICE INTERVALS - SEPARATE EACH DATE RANGE! (CRITICAL!)
Documents often GROUP date ranges with same prices into one line:
- "18.05.-31.05. i 29.09.-05.10.: €42"
- "01.06.-30.06. / 01.09.-28.09."

**You MUST create SEPARATE interval entries for each date range, even if prices are identical!**
This is critical for date-based matching to work correctly.

**Example transformation:**
Document shows: "18.05.-31.05. i 29.09.-05.10.: €42 per person"
You create TWO intervals:
1. \`{ "name": "Predsezona Maj", "start_date": "2026-05-18", "end_date": "2026-05-31" }\`
2. \`{ "name": "Postsezona Septembar/Oktobar", "start_date": "2026-09-29", "end_date": "2026-10-05" }\`

**Name them descriptively in Serbian:**
- Early season (May): "Predsezona Maj"
- High season (July-August): "Glavna sezona Jul", "Glavna sezona Avgust"
- Late season (September): "Postsezona Septembar"

**The price_matrix then references EACH interval separately**, both with the same price.

### 7. HOTEL DESCRIPTION & AMENITIES
Extract any marketing text, descriptions, or amenities about the hotel:
- **hotel_description**: Any descriptive text about the hotel (location, features, atmosphere)
- **hotel_amenities**: List of amenities (pool, spa, gym, beach, restaurant, WiFi, parking, etc.)
- **distance_from_beach**: Distance from beach/sea in meters (extract from text like "280m od plaže")
- **distance_from_center**: Distance from city center in meters

**ALSO GENERATE a professional description:**
- **generated_description**: Write a compelling 2-3 sentence marketing description in Serbian (Latin script)
- Based on: hotel name, star rating, location, included services, meal plans, amenities
- Style: Professional, inviting, highlights key selling points
- Example: "Pearl Beach Resort je moderan hotel sa 4 zvezdice smešten na obali Jadranskog mora, na samo 100m od plaže. Gostima je na raspolaganju all-inclusive usluga, 4 bazena sa Aqua Parkom, besplatne ležaljke i suncobrani. Idealan izbor za porodice sa decom i parove koji traže odmor uz more."

### 8. MULTI-HOTEL/MULTI-BUILDING DOCUMENTS (CRITICAL!)
Many documents contain MULTIPLE hotels or buildings within the same complex. These MUST be parsed as SEPARATE PACKAGES.

**Key indicators of separate hotels/buildings:**
- Column headers like "SPIC" and "HILLS" alongside room codes
- Underlined names with their own room configurations (e.g., "**SPIČ** 1/2 1/3 1/4 1/5 1/6 ALL")
- Different distance from beach per building
- Different amenities or warnings per building
- Separate pricing columns in the price matrix

**How to parse:**
1. If you see room columns like "1/2", "1/4_SUP", "1/4_APT", "SPIC", "HILLS" - the SPIC and HILLS are SEPARATE HOTELS
2. Create a SEPARATE package for each distinct hotel/building
3. Each package gets its own:
   - hotel_name (e.g., "Pearl Beach - SPIC", "Pearl Beach - HILLS")
   - room_types appropriate for that building
   - price_matrix for that building's rooms
   - room_details with warnings specific to that building
   - children_policies (if they differ by building)

**Example from real document:**
\`\`\`
| Interval | 1/2 | 1/4_SUP | SPIC | HILLS |
| 18.05-31.05 | €42 | €44 | €42 | €42 |
\`\`\`
AND later in the document:
"**SPIČ** 1/2 1/3 1/4 1/5 1/6 ALL"
"**HILLS** 1/3 1/4 ALL"

This means:
- Main building has room types: 1/2, 1/4_SUP, 1/4_APT, etc.
- SPIC building has room types: 1/2, 1/3, 1/4, 1/5, 1/6 (all at the SPIC column price)
- HILLS building has room types: 1/3, 1/4 (all at the HILLS column price)

Create 3 packages: Main building, SPIC, and HILLS.

---

## JSON SCHEMA

\`\`\`json
{
  "document_info": {
    "type": "price_list | contract | offer | unknown",
    "supplier_name": "string or null",
    "season": "e.g., 'Summer 2026'",
    "valid_from": "YYYY-MM-DD or null",
    "valid_to": "YYYY-MM-DD or null",
    "currency": "EUR | BAM | RSD | HRK",
    "source_text": "Original document title"
  },

  "business_model": {
    "type": "vlastita_marza | posrednik",
    "indicator": "What in the document indicates the model (e.g., 'net prices')",
    "notes": "string or null"
  },

  "packages": [
    // NOTE: Create SEPARATE entries for each distinct hotel/building!
    // If document has main hotel + SPIC + HILLS, create 3 package entries
    {
      "hotel_name": "string (e.g., 'Pearl Beach' or 'Pearl Beach - SPIC')",
      "building_code": "string or null (e.g., 'SPIC', 'HILLS', 'MAIN')",
      "stars": "1-5 or null",
      "destination": {
        "country": "string",
        "city": "string or null",
        "region": "string or null"
      },

      // Hotel description and amenities
      "hotel_description": "string or null - extracted text about the hotel",
      "hotel_amenities": ["pool", "spa", "beach", "restaurant", "parking", "WiFi"],
      "distance_from_beach": "number in meters or null",
      "distance_from_center": "number in meters or null",
      "generated_description": "AI-generated 2-3 sentence marketing description in Serbian",

      "price_type": "per_person_per_night | per_person_per_stay | per_room_per_night",
      "base_occupancy": 2,
      "meal_plan": "AI | FB | HB | BB | ND",

      "room_types": [
        {
          "code": "1/2",
          "name": "Double room (in target language)",
          "name_full": "Standard room with balcony",
          "max_persons": 2,
          "source_text": "string"
        }
      ],

      "price_intervals": [
        // IMPORTANT: Create SEPARATE entries for EACH date range!
        // If document says "18.05.-31.05. i 29.09.-05.10." - create TWO entries!
        {
          "name": "Descriptive name (e.g., 'Predsezona Maj', 'Glavna sezona Jul')",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD"
        }
      ],

      "price_matrix": {
        "[interval_name]": {
          "[room_code]": {
            "[meal_plan_code]": 123.00
          }
        }
      },

      "children_policies": [
        {
          "rule_name": "Descriptive rule name (in target language)",
          "priority": 1,
          "age_from": 0,
          "age_to": 2.99,
          "conditions": {
            "min_adults": "null or number",
            "max_adults": "null or number",
            "child_position": "null or 1/2/3/4 (first child, second child...)",
            "room_types": "null or ['1/3', 'SPIC']",
            "bed_type": "any | separate | shared"
          },
          "discount_type": "FREE | PERCENT | FIXED",
          "discount_value": "null for FREE, percentage for PERCENT, amount for FIXED",
          "source_text": "Original text from document"
        }
      ],

      "occupancy_pricing": {
        "base_occupancy": 2,
        "single_supplement_percent": 70,
        "third_person_discount_percent": 30,
        "fourth_person_discount_percent": 30,
        "source_text": "For 3rd and 4th bed 30% discount"
      },

      "room_details": [
        {
          "room_type_code": "HILLS",
          "description": "string",
          "size_sqm": 25,
          "distance_from_beach": 200,
          "bed_config": "string or null",
          "view": "sea | garden | pool | mountain | park | null",
          "max_occupancy": 4,
          "max_adults": 3,
          "min_adults": "null or number",
          "amenities": ["string"],
          "warnings": ["Not suitable for elderly - no elevator", "Stairs only"],
          "source_text": "string"
        }
      ],

      "confidence": "0.0-1.0"
    }
  ],

  "supplements": [
    {
      "code": "SEA_VIEW | BABY_COT | SINGLE_USE | EXTRA_BED | ...",
      "name": "Sea view (in target language)",
      "amount": "7 (fixed amount) or null",
      "percent": "70 (percentage) or null",
      "per": "night | stay | person_night | person_stay",
      "currency": "EUR",
      "mandatory": false,
      "conditions": "{ occupancy: 1 } or null",
      "source_text": "Sea view supplement 7 euros per person per day"
    }
  ],

  "mandatory_fees": [
    {
      "code": "TOURIST_TAX | INSURANCE | RESORT_FEE",
      "name": "Tourist tax (in target language)",
      "rules": [
        { "age_from": 0, "age_to": 1.99, "amount": 0 },
        { "age_from": 2, "age_to": 7.99, "amount": 14 },
        { "age_from": 8, "age_to": 99, "amount": 28 }
      ],
      "currency": "BAM",
      "per": "stay | night",
      "source_text": "string"
    }
  ],

  "discounts": [
    {
      "code": "EARLY_BIRD | LAST_MINUTE | LONG_STAY",
      "name": "Early booking (in target language)",
      "percent": 10,
      "conditions": {
        "book_before": "2026-03-01",
        "min_nights": "null or number"
      },
      "valid_from": "YYYY-MM-DD or null",
      "valid_to": "YYYY-MM-DD or null",
      "source_text": "string"
    }
  ],

  "policies": {
    "deposit": {
      "percent": 30,
      "due": "on_booking | within_3_days | ...",
      "balance_due_days_before": 14,
      "source_text": "30% deposit of total price"
    },
    "cancellation": {
      "rules": [
        { "days_before": 14, "penalty_percent": 0 },
        { "days_before": 7, "penalty_percent": 30 },
        { "days_before": 0, "penalty_percent": 100 }
      ],
      "source_text": "string"
    },
    "restrictions": {
      "min_stay": 7,
      "check_in_days": ["saturday"],
      "min_adults": "null or number",
      "min_advance_booking_days": "null or number",
      "documents_required": ["ID card or passport"],
      "source_text": "string"
    },
    "payment_options": {
      "installments_available": true,
      "card_payment_fee_percent": 5,
      "source_text": "string"
    }
  },

  "transport": {
    "included_in_package_price": false,
    "type": "bus | plane | ferry | own",
    "operator": "Transturist",
    "routes": [
      {
        "departure_city": "Tuzla",
        "departure_point": "string or null",
        "destination": "Durres",
        "adult_price": 129,
        "child_price": 89,
        "child_age_from": 4,
        "child_age_to": 11.99,
        "infant_price": 0,
        "infant_age_to": 3.99,
        "currency": "EUR",
        "standalone_adult_price": 169,
        "standalone_child_price": 109,
        "source_text": "Tuzla Durres 129 FREE 89"
      }
    ]
  },

  "included_services": [
    "Free sunbeds and umbrellas on beach (in target language)",
    "Free sunbeds at 4 pools and Aqua Park",
    "Free parking"
  ],

  "important_notes": [
    {
      "type": "warning | info | promo",
      "text": "Hills not suitable for elderly - no elevator, stairs only (in target language)",
      "applies_to": ["HILLS"]
    },
    {
      "type": "info",
      "text": "New building SPIC - 130 rooms 280m from sea",
      "applies_to": ["SPIC"]
    }
  ],

  "parsing_confidence": {
    "overall": 0.85,
    "issues": [
      "Some prices may have OCR errors",
      "Transport prices extracted from separate section"
    ]
  }
}
\`\`\`

---

## CONFIDENCE SCORE GUIDELINES

- **0.9+** = Clearly parsed, confident in all data
- **0.7-0.9** = Most data OK, some things may need verification
- **<0.7** = Significant uncertainties, needs human review

---

## CRITICAL NOTES

1. **NEVER fabricate data.** If something is unclear, set confidence to low and explain in issues.
2. **If a section doesn't exist in the document, DO NOT include it in JSON.**
3. **Preserve source_text** for all policies and rules - this is the audit trail.
4. **Convert all dates to ISO format** (YYYY-MM-DD). For "18.05.-31.05." assume the context year.
5. **Distinguish meal plans**: ND=room only, BB=breakfast, HB=half board, FB=full board, AI=all inclusive
`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function repairJson(jsonString: string): string {
  let repaired = jsonString.trim();

  // Count opening and closing braces/brackets
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;

  // Remove trailing incomplete content after last complete value
  repaired = repaired.replace(/,\s*"[^"]*$/, ""); // Remove incomplete string at end
  repaired = repaired.replace(/,\s*$/, ""); // Remove trailing comma
  repaired = repaired.replace(/,\s*\}/, "}"); // Remove comma before }
  repaired = repaired.replace(/,\s*\]/, "]"); // Remove comma before ]

  // Add missing closing brackets/braces
  const missingBrackets = openBrackets - closeBrackets;
  const missingBraces = openBraces - closeBraces;

  for (let i = 0; i < missingBrackets; i++) {
    repaired += "]";
  }
  for (let i = 0; i < missingBraces; i++) {
    repaired += "}";
  }

  return repaired;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMarginToResult(result: any, marginPercent: number): any {
  const multiplier = 1 + marginPercent / 100;

  return {
    ...result,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packages: result.packages.map((pkg: any) => ({
      ...pkg,
      price_matrix: Object.fromEntries(
        Object.entries(pkg.price_matrix).map(([interval, rooms]) => [
          interval,
          Object.fromEntries(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.entries(rooms as any).map(([room, meals]) => [
              room,
              Object.fromEntries(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Object.entries(meals as any).map(([meal, price]) => [
                  meal,
                  Math.ceil((price as number) * multiplier),
                ])
              ),
            ])
          ),
        ])
      ),
    })),
    transport: result.transport
      ? {
          ...result.transport,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prices: result.transport.prices?.map((p: any) => ({
            ...p,
            price: Math.ceil(p.price * multiplier),
            child_price: p.child_price
              ? Math.ceil(p.child_price * multiplier)
              : undefined,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          routes: result.transport.routes?.map((r: any) => ({
            ...r,
            adult_price: Math.ceil(r.adult_price * multiplier),
            child_price: r.child_price
              ? Math.ceil(r.child_price * multiplier)
              : undefined,
            standalone_adult_price: r.standalone_adult_price
              ? Math.ceil(r.standalone_adult_price * multiplier)
              : undefined,
            standalone_child_price: r.standalone_child_price
              ? Math.ceil(r.standalone_child_price * multiplier)
              : undefined,
          })),
        }
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateParseResult(result: any): string[] {
  const issues: string[] = [];

  if (!result.packages || result.packages.length === 0) {
    issues.push("No packages found in document");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const pkg of result.packages || []) {
    if (!pkg.hotel_name) {
      issues.push("Package missing hotel name");
    }
    if (!pkg.destination?.country) {
      issues.push(`Package "${pkg.hotel_name}": missing destination country`);
    }
    if (!pkg.room_types || pkg.room_types.length === 0) {
      issues.push(`Package "${pkg.hotel_name}": no room types found`);
    }
    if (!pkg.price_intervals || pkg.price_intervals.length === 0) {
      issues.push(`Package "${pkg.hotel_name}": no price intervals found`);
    }
    if (!pkg.price_matrix || Object.keys(pkg.price_matrix).length === 0) {
      issues.push(`Package "${pkg.hotel_name}": no prices found`);
    }
  }

  return issues;
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client with service role (bypasses RLS)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  let importId: string | null = null;

  try {
    const body: ParseDocumentRequest = await req.json();
    importId = body.import_id;

    const {
      file_url,
      currency,
      margin_percent,
      language_region = "ba",
    } = body;

    console.log(`Starting parse for import ${importId}`);

    // Update progress: 10% - Started processing
    await supabase
      .from("document_imports")
      .update({ status: "processing", progress: 10 })
      .eq("id", importId);

    // Download PDF from signed URL
    console.log("Downloading PDF from Storage...");
    const pdfResponse = await fetch(file_url);

    if (!pdfResponse.ok) {
      throw new Error(
        `Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(
      String.fromCharCode(...new Uint8Array(pdfBuffer))
    );

    // Update progress: 30% - PDF downloaded
    await supabase
      .from("document_imports")
      .update({ progress: 30 })
      .eq("id", importId);

    console.log("Calling Claude Sonnet API...");

    // Build prompts
    const systemPrompt = getSystemPrompt(language_region);
    const currencyContext = `IMPORTANT: All prices in this document are in ${currency}. Do NOT convert prices, keep them in their original currency (${currency}).`;
    const userPrompt = getDocumentParsePrompt(language_region) + `\n\n${currencyContext}`;

    // Call Claude Sonnet 4.5 API with native PDF support
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 64000,  // Sonnet 4.5 supports up to 64K output
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    // Update progress: 70% - Claude responded
    await supabase
      .from("document_imports")
      .update({ progress: 70 })
      .eq("id", importId);

    console.log(`Claude response received, stop_reason: ${response.stop_reason}`);

    // Extract text from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Check if response was truncated
    if (response.stop_reason === "max_tokens") {
      console.warn("Warning: Response was truncated due to max_tokens limit");
    }

    // Extract JSON from response
    let jsonString = textContent.text;

    // Remove markdown code block if present
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    }

    // Find the JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Raw response:", textContent.text.substring(0, 500));
      throw new Error("No JSON found in response");
    }

    let parseResult;
    const jsonToParse = jsonMatch[0];

    // Try to parse, and if it fails, attempt repair
    try {
      parseResult = JSON.parse(jsonToParse);
    } catch (parseError) {
      console.warn("Initial JSON parse failed, attempting repair...");
      const repaired = repairJson(jsonToParse);

      try {
        parseResult = JSON.parse(repaired);
        console.log("JSON repair successful");
      } catch (repairError) {
        console.error("JSON repair failed. Original error:", parseError);
        console.error("JSON length:", jsonToParse.length);
        console.error("Last 200 chars:", jsonToParse.slice(-200));
        throw parseError;
      }
    }

    // Override currency with user-specified value
    parseResult.currency = currency;
    parseResult.packages = parseResult.packages.map((pkg: { currency?: string }) => ({
      ...pkg,
      currency: currency,
    }));

    // Validate parse result
    const validationIssues = validateParseResult(parseResult);
    if (validationIssues.length > 0) {
      if (!parseResult.confidence) {
        parseResult.confidence = {
          overall: parseResult.parsing_confidence?.overall ?? 0.5,
          issues: parseResult.parsing_confidence?.issues ?? [],
        };
      }
      parseResult.confidence.issues = [
        ...(parseResult.confidence.issues || []),
        ...validationIssues,
      ];
    }

    // Apply margin if specified
    if (margin_percent && margin_percent > 0) {
      parseResult = applyMarginToResult(parseResult, margin_percent);
    }

    // Update progress: 100% - Complete
    const { error: updateError } = await supabase
      .from("document_imports")
      .update({
        status: "completed",
        progress: 100,
        parsed_at: new Date().toISOString(),
        parse_result: parseResult,
        packages_found: parseResult.packages?.length || 0,
      })
      .eq("id", importId);

    if (updateError) {
      console.error("Error updating document_imports:", updateError);
      throw updateError;
    }

    console.log(`Parse complete for import ${importId}, found ${parseResult.packages?.length || 0} packages`);

    return new Response(
      JSON.stringify({ success: true, packages_found: parseResult.packages?.length || 0 }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Edge Function error:", error);

    // Always update DB on failure
    if (importId) {
      await supabase
        .from("document_imports")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          progress: 0,
        })
        .eq("id", importId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
