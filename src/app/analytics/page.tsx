"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SelectField } from "@/components/SelectField";
import { MultiSelectField } from "@/components/MultiSelectField";
import { REGIONS } from "@/types/morning-meeting";
import labelsData from "@/lib/labels.json";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Calendar, TrendingUp, FileText, Globe, Filter, Map as MapIcon, Maximize2, Network, BarChart3 } from "lucide-react";
import { WorldMapHeatmap } from "@/components/WorldMapHeatmap";

const COUNTRIES: string[] = ((labelsData as Record<string, unknown>).countries || []) as string[];

interface AnalyticsData {
  regionalDistribution: { region: string; count: string }[];
  categoryDistribution: { category: string; count: string }[];
  priorityDistribution: { priority: string; count: string }[];
  entryLengthDistribution: { length_range: string; count: string }[];
  chronologicalData: { date: string; region: string; count: string }[];
  entriesPerMonth: { month: string; count: string }[];
  totalStats: {
    total_entries: string;
    total_regions: string;
    total_authors: string;
    avg_entry_length: string;
  };
  topCountries: { country_name: string; count: string }[];
  allCountries: { country_name: string; count: string }[];
  countryConnections?: { country1: string; country2: string; count: string }[];
}

const UN_COLORS = [
  "#0066CC", // UN Blue (primary)
  "#009EDB", // Light Blue
  "#4A90E2", // Sky Blue
  "#667B91", // Slate Blue
  "#8FA6B8", // Steel Blue
  "#5B92C7", // Medium Blue
  "#3D7AB5", // Deep Blue
  "#C4D8E3", // Pale Blue
  "#7E99AC", // Gray Blue
  "#96B3C8", // Muted Blue
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<[number, number]>([0, 100]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [allAvailableDates, setAllAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showConnections, setShowConnections] = useState(false);

  // Get start and end dates from the slider values (using full available date range)
  const getDateFromSlider = (index: number): string => {
    if (allAvailableDates.length === 0) return "";
    return allAvailableDates[Math.min(index, allAvailableDates.length - 1)];
  };

  const startDate = getDateFromSlider(Math.floor((dateRange[0] / 100) * allAvailableDates.length));
  const endDate = getDateFromSlider(Math.floor((dateRange[1] / 100) * allAvailableDates.length));

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedRegion) params.append("regions", selectedRegion);
      if (selectedCountries.length > 0) params.append("countries", selectedCountries.join(","));

      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Analytics data received:", {
          countryConnections: data.countryConnections?.length || 0,
          allCountries: data.allCountries?.length || 0
        });
        setAnalyticsData(data);
        
        // Extract unique dates from chronological data only on initial load
        // This ensures the slider always shows the full available range, not filtered subset
        if (allAvailableDates.length === 0) {
          const uniqueDates = Array.from(
            new Set(data.chronologicalData?.map((item: any) => item.date) || [])
          ).sort() as string[];
          setAllAvailableDates(uniqueDates);
        }
      } else {
        console.error("API response not OK:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleApplyFilters = () => {
    fetchAnalytics();
  };

  const handleClearFilters = () => {
    setDateRange([0, 100]);
    setSelectedRegion("");
    setSelectedCountries([]);
    // Fetch with no filters
    setTimeout(() => fetchAnalytics(), 0);
  };

  const regionOptions = REGIONS.map((region) => ({
    value: region,
    label: region,
  }));

  const countryOptions = COUNTRIES.map((country) => ({
    value: country,
    label: country,
  }));

  // Transform data for charts
  const regionalData = analyticsData?.regionalDistribution?.map((item) => ({
    name: item.region,
    count: parseInt(item.count),
  })) || [];

  const topRegions = regionalData.slice(0, 5);

  const categoryData = analyticsData?.categoryDistribution?.map((item) => ({
    name: item.category,
    count: parseInt(item.count),
  })) || [];

  const priorityData = analyticsData?.priorityDistribution?.map((item) => ({
    name: item.priority,
    count: parseInt(item.count),
  })) || [];

  const entryLengthData = analyticsData?.entryLengthDistribution?.map((item) => ({
    name: item.length_range,
    count: parseInt(item.count),
  })) || [];

  // Helper function to clean country names from JSON artifacts and invalid entries
  const cleanCountryName = (name: string): string => {
    return name
      .replace(/^\[/, '') // Remove leading bracket
      .replace(/\]$/, '') // Remove trailing bracket
      .replace(/^"/, '') // Remove leading quote
      .replace(/"$/, '') // Remove trailing quote
      .replace(/\\"/g, '"') // Unescape quotes
      .replace(/\s*\([^)]*\)$/g, '') // Remove trailing parentheses
      .trim();
  };

  const topCountriesData = analyticsData?.topCountries
    .map((item) => {
      const cleanName = cleanCountryName(item.country_name);
      return {
        name: cleanName,
        count: parseInt(item.count),
      };
    })
    .filter((item) => {
      // Only filter out truly invalid entries
      if (!item.name || item.name === '[]' || item.name === '') return false;
      if (item.count <= 0) return false;
      return true;
    })
    || [];

  // Transform chronological data for area chart (exclude weekends)
  const chronologicalMap = new Map<string, Record<string, number>>();
  analyticsData?.chronologicalData.forEach((item) => {
    const date = new Date(item.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return;
    }

    if (!chronologicalMap.has(item.date)) {
      chronologicalMap.set(item.date, {});
    }
    const dateData = chronologicalMap.get(item.date)!;
    dateData[item.region] = parseInt(item.count);
  });

  const chronologicalChartData = Array.from(chronologicalMap.entries())
    .map(([date, regions]) => ({
      date,
      ...regions,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const allRegionsInChronological = Array.from(
    new Set(analyticsData?.chronologicalData.map((item) => item.region) || [])
  );

  const monthlyData = analyticsData?.entriesPerMonth.map((item) => ({
    month: new Date(item.month).toLocaleDateString("en-US", { year: "numeric", month: "short" }),
    count: parseInt(item.count),
  })) || [];

  return (
    <div className="bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <Card className="border-slate-200 py-0 mb-6">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                <BarChart3 className="h-5 w-5 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {labelsData.analytics.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {labelsData.analytics.subtitle}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Filters Section */}
        <Card className="mb-6 py-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {labelsData.analytics.filters.title}
            </CardTitle>
            <CardDescription>{labelsData.analytics.filters.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {labelsData.analytics.filters.region}
                </label>
                <SelectField
                  placeholder={labelsData.analytics.filters.allRegions}
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                  options={regionOptions}
                  showLabel={false}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {labelsData.analytics.filters.countries}
                </label>
                <MultiSelectField
                  placeholder={labelsData.analytics.filters.allCountries}
                  value={selectedCountries}
                  onValueChange={setSelectedCountries}
                  options={countryOptions}
                  showLabel={false}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {labelsData.analytics.filters.dateRange}
                </label>
                <div className="space-y-2">
                  <Slider
                    value={dateRange}
                    onValueChange={(value) => setDateRange([value[0], value[1]] as [number, number])}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full [&_[data-slot=slider-track]]:bg-blue-200 [&_[data-slot=slider-range]]:bg-un-blue"
                  />
                  <div className="text-xs text-slate-600">
                    {startDate ? new Date(startDate).toLocaleDateString() : "Start"} → {endDate ? new Date(endDate).toLocaleDateString() : "End"}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleApplyFilters} className="bg-un-blue hover:bg-un-blue/90">
                {labelsData.analytics.filters.apply}
              </Button>
              <Button onClick={handleClearFilters} variant="outline">
                {labelsData.analytics.filters.clearAll}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* World Map Heatmap */}
        <Card className="mb-6">
          <CardContent className="relative">
            <div className="absolute right-10 top-4 z-10 flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMapFullscreen(true)}
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                title={labelsData.analytics.map.expandFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConnections(!showConnections)}
                className={`h-8 w-8 p-0 ${showConnections ? 'bg-un-blue text-white hover:bg-un-blue/90' : 'bg-white/90 hover:bg-white'}`}
                title={labelsData.analytics.map.toggleConnections}
              >
                <Network className="h-4 w-4" />
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-un-blue"></div>
                  <p className="mt-2 text-sm text-slate-600">{labelsData.analytics.loading.map}</p>
                </div>
              </div>
            ) : (
              <WorldMapHeatmap
                data={analyticsData?.allCountries || []}
                connections={showConnections ? (analyticsData?.countryConnections || []) : []}
                className="h-[400px]"
              />
            )}
          </CardContent>
        </Card>

        {/* Fullscreen Map Dialog */}
        {isMapFullscreen && (
          <div className="fixed inset-0 z-50 bg-white">
            <div className="relative h-full w-full overflow-hidden">
              <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMapFullscreen(false)}
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                  title={labelsData.analytics.map.exitFullscreen}
                >
                  <span className="text-xl leading-none">×</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConnections(!showConnections)}
                  className={`h-8 w-8 p-0 ${showConnections ? 'bg-un-blue text-white hover:bg-un-blue/90' : 'bg-white/90 hover:bg-white'}`}
                  title={labelsData.analytics.map.toggleConnections}
                >
                  <Network className="h-4 w-4" />
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-un-blue"></div>
                    <p className="mt-2 text-sm text-slate-600">{labelsData.analytics.loading.map}</p>
                  </div>
                </div>
              ) : (
                <WorldMapHeatmap
                  data={analyticsData?.allCountries || []}
                  connections={showConnections ? (analyticsData?.countryConnections || []) : []}
                  className="h-full"
                />
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-un-blue"></div>
              <p className="mt-4 text-sm text-slate-600">{labelsData.analytics.loading.data}</p>
            </div>
          </div>
        ) : analyticsData && analyticsData.totalStats ? (
          <>
            {/* Stats Overview */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <FileText className="h-4 w-4" />
                    {labelsData.analytics.stats.totalEntries}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {analyticsData.totalStats?.total_entries 
                      ? parseInt(analyticsData.totalStats.total_entries).toLocaleString()
                      : "0"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Globe className="h-4 w-4" />
                    {labelsData.analytics.stats.regionsCovered}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {analyticsData.totalStats?.total_regions || "0"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <TrendingUp className="h-4 w-4" />
                    {labelsData.analytics.stats.avgEntryLength}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {analyticsData.totalStats?.avg_entry_length
                      ? `${Math.round(parseFloat(analyticsData.totalStats.avg_entry_length) / 5)} ${labelsData.analytics.stats.words}`
                      : `0 ${labelsData.analytics.stats.words}`}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Calendar className="h-4 w-4" />
                    {labelsData.analytics.stats.contributors}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {analyticsData.totalStats?.total_authors || "0"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Regional Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>{labelsData.analytics.charts.regionalDistribution}</CardTitle>
                  <CardDescription>{labelsData.analytics.charts.regionalDistributionDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={regionalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="#0066CC" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top 5 Regions */}
              <Card>
                <CardHeader>
                  <CardTitle>{labelsData.analytics.charts.topRegions}</CardTitle>
                  <CardDescription>{labelsData.analytics.charts.topRegionsDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topRegions}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {topRegions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={UN_COLORS[index % UN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>{labelsData.analytics.charts.categoryDistribution}</CardTitle>
                  <CardDescription>{labelsData.analytics.charts.categoryDistributionDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="#0066CC" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Entry Length Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>{labelsData.analytics.charts.entryLengthDistribution}</CardTitle>
                  <CardDescription>{labelsData.analytics.charts.entryLengthDistributionDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={entryLengthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="#009EDB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Countries */}
              <Card>
                <CardHeader>
                  <CardTitle>{labelsData.analytics.charts.topCountries}</CardTitle>
                  <CardDescription>{labelsData.analytics.charts.topCountriesDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCountriesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="#4A90E2" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Entry Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>{labelsData.analytics.charts.monthlyTrends}</CardTitle>
                  <CardDescription>{labelsData.analytics.charts.monthlyTrendsDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#0066CC"
                        strokeWidth={2}
                        dot={{ fill: "#0066CC", r: 4 }}
                        activeDot={{ r: 6 }}
                        name={labelsData.analytics.charts.entries}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Regional Activity Over Time - Full Width */}
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{labelsData.analytics.charts.regionalActivity}</CardTitle>
                  <CardDescription>{labelsData.analytics.charts.regionalActivityDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chronologicalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        }
                      />
                      <Legend />
                      {allRegionsInChronological.map((region, index) => (
                        <Area
                          key={region}
                          type="monotone"
                          dataKey={region}
                          stackId="1"
                          stroke={UN_COLORS[index % UN_COLORS.length]}
                          fill={UN_COLORS[index % UN_COLORS.length]}
                          fillOpacity={0.6}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-slate-600 mb-2">{labelsData.analytics.empty.title}</p>
            <p className="text-sm text-slate-500">
              {labelsData.analytics.empty.description}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
