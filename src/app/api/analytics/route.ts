import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  console.log("Analytics API called");
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const regions = searchParams.get("regions");
    const countries = searchParams.get("countries");

    console.log("Filters:", { startDate, endDate, regions, countries });

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`date >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`date <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    if (regions) {
      const regionList = regions.split(",");
      conditions.push(`region = ANY($${paramIndex})`);
      params.push(regionList);
      paramIndex++;
    }

    if (countries) {
      const countryList = countries.split(",");
      // Check if any of the selected countries appear in the country field (which is JSON array)
      const countryConditions = countryList.map((_, idx) => {
        const condition = `country LIKE $${paramIndex + idx}`;
        return condition;
      });
      conditions.push(`(${countryConditions.join(" OR ")})`);
      countryList.forEach((country) => {
        params.push(`%"${country}"%`);
      });
      paramIndex += countryList.length;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    console.log("WHERE clause:", whereClause);
    console.log("Params:", params);

    // Get regional distribution
    let regionalDistribution;
    try {
      regionalDistribution = await db.query(
        `SELECT region, COUNT(*) as count
         FROM pu_morning_briefings.entries
         ${whereClause}
         GROUP BY region
         ORDER BY count DESC`,
        params
      );
      console.log("Regional distribution fetched:", regionalDistribution.rows.length, "rows");
    } catch (error) {
      console.error("Error fetching regional distribution:", error);
      regionalDistribution = { rows: [] };
    }

    // Get category distribution
    let categoryDistribution;
    try {
      categoryDistribution = await db.query(
        `SELECT category, COUNT(*) as count
         FROM pu_morning_briefings.entries
         ${whereClause}
         GROUP BY category
         ORDER BY count DESC`,
        params
      );
    } catch (error) {
      console.error("Error fetching category distribution:", error);
      categoryDistribution = { rows: [] };
    }

    // Get priority distribution
    let priorityDistribution;
    try {
      priorityDistribution = await db.query(
        `SELECT priority, COUNT(*) as count
         FROM pu_morning_briefings.entries
         ${whereClause}
         GROUP BY priority
         ORDER BY count DESC`,
        params
      );
    } catch (error) {
      console.error("Error fetching priority distribution:", error);
      priorityDistribution = { rows: [] };
    }

    // Get entry length distribution
    let entryLengthQuery;
    try {
      entryLengthQuery = await db.query(
        `SELECT 
           CASE 
             WHEN LENGTH(entry) < 500 THEN '< 500'
             WHEN LENGTH(entry) < 1000 THEN '500-1000'
             WHEN LENGTH(entry) < 2000 THEN '1000-2000'
             WHEN LENGTH(entry) < 3000 THEN '2000-3000'
             ELSE '> 3000'
           END as length_range,
           COUNT(*) as count
         FROM pu_morning_briefings.entries
         ${whereClause}
         GROUP BY length_range
         ORDER BY 
           CASE length_range
             WHEN '< 500' THEN 1
             WHEN '500-1000' THEN 2
             WHEN '1000-2000' THEN 3
             WHEN '2000-3000' THEN 4
             ELSE 5
           END`,
        params
      );
    } catch (error) {
      console.error("Error fetching entry length distribution:", error);
      entryLengthQuery = { rows: [] };
    }

    // Get chronological data (entries per day by region)
    let chronologicalData;
    try {
      chronologicalData = await db.query(
        `SELECT 
           DATE(date) as date,
           region,
           COUNT(*) as count
         FROM pu_morning_briefings.entries
         ${whereClause}
         GROUP BY DATE(date), region
         ORDER BY date ASC`,
        params
      );
    } catch (error) {
      console.error("Error fetching chronological data:", error);
      chronologicalData = { rows: [] };
    }

    // Get entries per month
    let entriesPerMonth;
    try {
      entriesPerMonth = await db.query(
        `SELECT 
           DATE_TRUNC('month', date) as month,
           COUNT(*) as count
         FROM pu_morning_briefings.entries
         ${whereClause}
         GROUP BY month
         ORDER BY month ASC`,
        params
      );
    } catch (error) {
      console.error("Error fetching entries per month:", error);
      entriesPerMonth = { rows: [] };
    }

    // Get total statistics
    let totalStats;
    try {
      totalStats = await db.query(
        `SELECT 
           COUNT(*) as total_entries,
           COUNT(DISTINCT region) as total_regions,
           COUNT(DISTINCT author) as total_authors,
           AVG(LENGTH(entry)) as avg_entry_length
         FROM pu_morning_briefings.entries
         ${whereClause}`,
        params
      );
    } catch (error) {
      console.error("Error fetching total stats:", error);
      totalStats = { rows: [{ total_entries: '0', total_regions: '0', total_authors: '0', avg_entry_length: '0' }] };
    }

    // Get top countries (simplified - just count country field occurrences)
    let topCountries;
    try {
      topCountries = await db.query(
        `SELECT 
           country as country_name,
           COUNT(*) as count
         FROM pu_morning_briefings.entries
         ${whereClause}
         GROUP BY country
         ORDER BY count DESC
         LIMIT 10`,
        params
      );
    } catch (error) {
      console.error("Error fetching top countries:", error);
      topCountries = { rows: [] };
    }

    const responseData = {
      regionalDistribution: regionalDistribution.rows,
      categoryDistribution: categoryDistribution.rows,
      priorityDistribution: priorityDistribution.rows,
      entryLengthDistribution: entryLengthQuery.rows,
      chronologicalData: chronologicalData.rows,
      entriesPerMonth: entriesPerMonth.rows,
      totalStats: totalStats.rows[0],
      topCountries: topCountries.rows,
    };

    console.log("Returning analytics data:", {
      regionalCount: regionalDistribution.rows.length,
      totalEntries: totalStats.rows[0]?.total_entries,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data", details: String(error) },
      { status: 500 }
    );
  }
}
