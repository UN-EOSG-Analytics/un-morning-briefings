import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import labelsData from "@/lib/labels.json";
import { checkAuth } from "@/lib/auth-helper";

// Get predefined countries list
const PREDEFINED_COUNTRIES: string[] = (
  (labelsData as Record<string, unknown>).countries || []
) as string[];

// GET /api/countries - Fetch all unique custom countries from the database
export async function GET() {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const result = await db.query(
      `SELECT DISTINCT country 
       FROM pu_morning_briefings.entries 
       WHERE country IS NOT NULL AND country != ''`
    );

    // Parse and flatten all country values
    const customCountriesSet = new Set<string>();
    
    result.rows.forEach((row: { country: string }) => {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(row.country);
        if (Array.isArray(parsed)) {
          parsed.forEach((country) => {
            const trimmed = country.trim();
            // Only include if it's NOT in the predefined list
            if (trimmed && !PREDEFINED_COUNTRIES.includes(trimmed)) {
              customCountriesSet.add(trimmed);
            }
          });
        } else if (typeof parsed === 'string') {
          const trimmed = parsed.trim();
          if (trimmed && !PREDEFINED_COUNTRIES.includes(trimmed)) {
            customCountriesSet.add(trimmed);
          }
        }
      } catch {
        // If not JSON, treat as plain string
        const trimmed = row.country.trim();
        if (trimmed && !PREDEFINED_COUNTRIES.includes(trimmed)) {
          customCountriesSet.add(trimmed);
        }
      }
    });

    // Convert to array and sort
    const countries = Array.from(customCountriesSet).sort();
    
    return NextResponse.json({ countries });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
