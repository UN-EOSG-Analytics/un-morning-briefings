import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const regions = searchParams.get("regions");
    const countries = searchParams.get("countries");

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
    } catch (error) {
      console.error("Analytics: regional distribution error:", error);
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
      console.error("Analytics: category error:", error);
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
      console.error("Analytics: priority error:", error);
      priorityDistribution = { rows: [] };
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
      console.error("Analytics: chronological error:", error);
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
      console.error("Analytics: entries per month error:", error);
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
      console.error("Analytics: total stats error:", error);
      totalStats = { rows: [{ total_entries: '0', total_regions: '0', total_authors: '0', avg_entry_length: '0' }] };
    }

    // Get top countries - parse in JavaScript for reliability
    let topCountries;
    try {
      // Get all raw country data
      const rawCountries = await db.query(
        `SELECT country
         FROM pu_morning_briefings.entries
         ${whereClause}`,
        params
      );

      // Parse countries in JavaScript
      const countryMap = new Map<string, number>();
      rawCountries.rows.forEach((row: any) => {
        if (!row.country) return;
        
        let countryStr = row.country;
        
        // Remove JSON array brackets if present
        countryStr = countryStr.replace(/^\[/, '').replace(/\]$/, '');
        // Remove quotes
        countryStr = countryStr.replace(/^"/, '').replace(/"$/, '').replace(/\\"/g, '"');
        // Split by comma and process each country
        const countries = countryStr.split(',').map((c: string) => {
          return c
            .trim()
            .replace(/^\["?/, '') // Remove opening bracket and quote
            .replace(/"\]?$/, '') // Remove closing bracket and quote
            .replace(/\s*\([^)]*\)$/, '') // Remove parenthetical text
            .trim();
        });
        
        countries.forEach((c: string) => {
          if (c && c !== '[]' && c !== '""' && c.length > 0) {
            countryMap.set(c, (countryMap.get(c) || 0) + 1);
          }
        });
      });

      // Convert to array and sort
      const countryArray = Array.from(countryMap.entries())
        .map(([name, count]) => ({ country_name: name, count: count.toString() }))
        .sort((a, b) => parseInt(b.count) - parseInt(a.count));

      // Top 10 for the chart, all for the map
      topCountries = { rows: countryArray.slice(0, 10), allRows: countryArray };
    } catch (error) {
      console.error("Analytics: top countries error:", error);
      topCountries = { rows: [], allRows: [] };
    }

    // Get country connections (co-occurrences)
    let countryConnections;
    try {
      // Get all entries with their countries
      const rawCountries = await db.query(
        `SELECT country
         FROM pu_morning_briefings.entries
         ${whereClause}`,
        params
      );

      // Parse and build co-occurrence map
      const connectionMap = new Map<string, number>();
      
      rawCountries.rows.forEach((row: any) => {
        if (!row.country) return;
        
        let countryStr = row.country;
        countryStr = countryStr.replace(/^\[/, '').replace(/\]$/, '');
        
        const countries = countryStr.split(',')
          .map((c: string) => {
            return c
              .trim()
              .replace(/^\["?/, '')
              .replace(/"\]?$/, '')
              .replace(/\s*\([^)]*\)$/, '')
              .replace(/\\"/g, '"')
              .trim();
          })
          .filter((c: string) => c && c !== '[]' && c !== '""' && c.length > 0);

        // Create connections between all pairs of countries in this entry
        for (let i = 0; i < countries.length; i++) {
          for (let j = i + 1; j < countries.length; j++) {
            const country1 = countries[i];
            const country2 = countries[j];
            
            // Create a consistent key (alphabetically sorted)
            const key = country1 < country2 
              ? `${country1}|||${country2}` 
              : `${country2}|||${country1}`;
            
            connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
          }
        }
      });

      // Convert to array
      const connectionArray = Array.from(connectionMap.entries())
        .map(([key, count]) => {
          const [country1, country2] = key.split('|||');
          return { country1, country2, count: count.toString() };
        })
        .filter(conn => parseInt(conn.count) >= 2) // Only show connections with 2+ co-occurrences
        .sort((a, b) => parseInt(b.count) - parseInt(a.count))
        .slice(0, 100); // Limit to top 100 connections to avoid clutter

      countryConnections = { rows: connectionArray };
    } catch (error) {
      console.error("Analytics: country connections error:", error);
      countryConnections = { rows: [] };
    }

    const responseData = {
      regionalDistribution: regionalDistribution.rows,
      categoryDistribution: categoryDistribution.rows,
      priorityDistribution: priorityDistribution.rows,
      chronologicalData: chronologicalData.rows,
      entriesPerMonth: entriesPerMonth.rows,
      totalStats: totalStats.rows[0],
      topCountries: topCountries.rows,
      allCountries: topCountries.allRows || [],
      countryConnections: countryConnections.rows,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data", details: String(error) },
      { status: 500 }
    );
  }
}
