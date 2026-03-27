"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  UserPlus,
  FileEdit,
  Clock,
  GitBranch,
  Sparkles,
  List,
  FileText,
  BarChart2,
  Settings,
  Table2,
  ChevronRight,
} from "lucide-react";
import labels from "@/lib/labels.json";

const sections = [
  { id: "welcome", label: "Welcome", icon: BookOpen },
  { id: "getting-started", label: "Getting Started", icon: UserPlus },
  { id: "creating-entry", label: "Creating an Entry", icon: FileEdit },
  { id: "cutoff", label: "8AM Cutoff & Briefing Dates", icon: Clock },
  { id: "lifecycle", label: "Entry Lifecycle", icon: GitBranch },
  { id: "ai-features", label: "AI Features", icon: Sparkles },
  { id: "viewing", label: "Viewing & Managing Entries", icon: List },
  { id: "briefing", label: "The Daily Briefing", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "settings", label: "Settings & Administration", icon: Settings },
  { id: "reference", label: "Quick Reference", icon: Table2 },
];

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="mb-4 flex scroll-mt-24 items-center gap-2.5 text-xl font-semibold text-slate-900"
    >
      <Icon className="h-5 w-5 shrink-0 text-un-blue" />
      {children}
    </h2>
  );
}

function InfoBox({
  children,
  variant = "blue",
}: {
  children: React.ReactNode;
  variant?: "blue" | "amber" | "green";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    green: "bg-green-50 border-green-200 text-green-900",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${colors[variant]}`}>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-un-blue text-xs font-bold text-white">
        {number}
      </div>
      <div className="pb-6">
        <p className="font-medium text-slate-900">{title}</p>
        <div className="mt-1 text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("welcome");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sectionIds = sections.map((s) => s.id);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    elements.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex gap-8">
        {/* Sticky TOC sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              On this page
            </p>
            <nav className="space-y-0.5">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                    activeSection === id
                      ? "bg-un-blue/10 font-medium text-un-blue"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-14">
          {/* 1. Welcome */}
          <section id="welcome">
            <div className="mb-6 border-b border-slate-200 pb-6">
              <p className="mb-1 text-sm font-medium text-un-blue">
                Internal Documentation
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                Morning Briefing System
              </h1>
              <p className="mt-2 text-slate-600">
                User guide for Political Analysts at the UN Executive Office of
                the Secretary-General (EOSG) — Political Unit.
              </p>
            </div>
            <SectionHeading id="welcome-body" icon={BookOpen}>
              Welcome
            </SectionHeading>
            <p className="text-sm text-slate-700">
              The <strong>Morning Briefing System</strong> is the internal tool
              used by the Political Unit (EOSG) to create, manage, review, and
              export the daily Morning Meeting Update — the briefing document
              distributed to UN leadership each morning.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Submit entries",
                  desc: "Analysts submit news items with structured metadata for each day's briefing.",
                },
                {
                  title: "Review & approve",
                  desc: "Entries are reviewed, approved, and marked as discussed during the meeting.",
                },
                {
                  title: "Export briefing",
                  desc: "The briefing is exported as a DOCX document or sent via email to recipients.",
                },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Getting Started */}
          <section id="getting-started">
            <SectionHeading id="getting-started" icon={UserPlus}>
              Getting Started
            </SectionHeading>
            <div className="space-y-0">
              <Step number={1} title="Request access">
                Contact your team lead or system administrator to have your{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">
                  @un.org
                </code>{" "}
                email address added to the authorized whitelist.
              </Step>
              <Step number={2} title="Create an account">
                Navigate to <strong>/login</strong> → <em>Create Account</em>.
                You must use your{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">
                  @un.org
                </code>{" "}
                email. Non-whitelisted addresses will be rejected.
              </Step>
              <Step number={3} title="Verify your email">
                Check your inbox for a verification link. The link expires in 24
                hours. Click it to activate your account.
              </Step>
              <Step number={4} title="Sign in">
                Return to <strong>/login</strong> and sign in with your
                credentials. Sessions last 24 hours.
              </Step>
            </div>
            <InfoBox variant="amber">
              <strong>Note:</strong> Only email addresses pre-approved by an
              administrator can register. If your registration is rejected,
              contact your system admin to be added to the whitelist.
            </InfoBox>
          </section>

          {/* 3. Creating an Entry */}
          <section id="creating-entry">
            <SectionHeading id="creating-entry" icon={FileEdit}>
              Creating an Entry
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              Click <strong>New Entry</strong> in the navigation bar or the
              Create card on the home page to open the entry form.
            </p>
            <div className="mb-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Field</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-left">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    [
                      "Category",
                      "Type of source document (Article, Code Cable, etc.)",
                      "Yes",
                    ],
                    [
                      "Priority",
                      "SG's attention or Situational Awareness",
                      "Yes",
                    ],
                    ["Region", "Geographic region covered by the entry", "Yes"],
                    [
                      "Countries/Tags",
                      "Specific countries or tags mentioned",
                      "No",
                    ],
                    [
                      "Headline",
                      "Concise, descriptive headline for the entry",
                      "Yes",
                    ],
                    [
                      "Entry Content",
                      "Rich text summary of the development",
                      "Yes (≥50 chars)",
                    ],
                    [
                      "Source Name",
                      "Name of the source publication or document",
                      "No",
                    ],
                    ["Source Date", "Date of the original source", "No"],
                    ["Source URL", "Link to the original source", "No"],
                    [
                      "PU Note",
                      "Internal Political Unit comment or annotation",
                      "No",
                    ],
                  ].map(([field, desc, req]) => (
                    <tr key={field} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {field}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{desc}</td>
                      <td className="px-4 py-2">
                        <Badge>{req}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3">
              <InfoBox variant="blue">
                <strong>Drafts:</strong> Click <em>Save Draft</em> to save
                without submitting. Drafts are only visible to you and can be
                edited or submitted later from <strong>My Drafts</strong>.
              </InfoBox>
              <InfoBox variant="green">
                <strong>Rich Text:</strong> The entry content editor supports
                rich text formatting — bold, italic, lists, links, and image
                embedding.
              </InfoBox>
            </div>
          </section>

          {/* 4. 8AM Cutoff */}
          <section id="cutoff">
            <SectionHeading id="cutoff" icon={Clock}>
              8AM Cutoff & Briefing Dates
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              Entries are automatically assigned to a{" "}
              <strong>briefing date</strong> based on an 8AM local time cutoff.
              This determines which day's Morning Meeting Update the entry will
              appear in.
            </p>
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                The Rule
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                  <span>
                    Entry submitted <strong>before 8AM</strong> → assigned to{" "}
                    <strong>today's</strong> briefing
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                  <span>
                    Entry submitted <strong>at or after 8AM</strong> → assigned
                    to <strong>next business day's</strong> briefing
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                  <span>
                    <strong>Weekends are skipped</strong> — Friday 8AM or later
                    → assigned to <strong>Monday's</strong> briefing
                  </span>
                </div>
              </div>
            </div>
            <div className="mb-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Submitted at</th>
                    <th className="px-4 py-2 text-left">
                      Assigned to briefing
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["Monday 7:45 AM", "Monday (today)"],
                    ["Monday 8:00 AM", "Tuesday"],
                    ["Monday 11:30 PM", "Tuesday"],
                    ["Friday 7:59 AM", "Friday (today)"],
                    ["Friday 8:00 AM", "Monday (next week)"],
                    ["Saturday any time", "Monday (next week)"],
                  ].map(([time, briefing]) => (
                    <tr key={time} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">
                        {time}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{briefing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InfoBox variant="amber">
              The home page always shows the{" "}
              <strong>current briefing date</strong> — the next upcoming morning
              meeting. The entries list can be filtered by any briefing date to
              view past or future entries.
            </InfoBox>
          </section>

          {/* 5. Entry Lifecycle */}
          <section id="lifecycle">
            <SectionHeading id="lifecycle" icon={GitBranch}>
              Entry Lifecycle
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              Entries flow through several states from creation to the morning
              meeting.
            </p>
            <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
              {[
                { label: "Draft", color: "bg-slate-100 text-slate-600" },
                { label: "→", color: "text-slate-400" },
                { label: "Submitted", color: "bg-blue-100 text-blue-700" },
                { label: "→", color: "text-slate-400" },
                { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
                { label: "→", color: "text-slate-400" },
                { label: "Discussed", color: "bg-green-100 text-green-700" },
              ].map(({ label, color }, i) =>
                label === "→" ? (
                  <span key={i} className="text-slate-400">
                    →
                  </span>
                ) : (
                  <span
                    key={i}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
            <div className="space-y-3 text-sm">
              {[
                {
                  status: "Draft",
                  desc: "Entry saved but not yet submitted. Only visible to the author. Can be edited or deleted freely.",
                },
                {
                  status: "Submitted",
                  desc: "Entry submitted for inclusion in the briefing. Visible to all team members in the entries list.",
                },
                {
                  status: "Pending",
                  desc: "Approval status for entries that have been approved for the current briefing. Shown in the daily briefing view.",
                },
                {
                  status: "Discussed",
                  desc: "Marked after the morning meeting has concluded and the entry was discussed. The entry is archived.",
                },
              ].map(({ status, desc }) => (
                <div
                  key={status}
                  className="flex gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <span className="mt-0.5 w-20 shrink-0 text-xs font-semibold text-slate-500">
                    {status}
                  </span>
                  <span className="text-slate-600">{desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-800">
                Additional actions
              </p>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-800">Follow Up</p>
                  <p className="mt-1 text-slate-600">
                    Create a new entry linked to an existing one. The new entry
                    references the original as a "Previous Entry."
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-800">Postpone</p>
                  <p className="mt-1 text-slate-600">
                    Move a pending entry to the next business day's briefing.
                    Status is reset to Pending.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. AI Features */}
          <section id="ai-features">
            <SectionHeading id="ai-features" icon={Sparkles}>
              AI Features
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              The system integrates Azure OpenAI (GPT-4o) to assist with
              drafting and editing entries. Three AI tools are available from
              the entry form.
            </p>
            <div className="space-y-4">
              {[
                {
                  name: "Auto-Fill",
                  when: "When starting a new entry from a source article",
                  what: "Paste raw article text or briefing content. The AI extracts Category, Priority, Region, Country, Headline, Source Date, and formats the entry content.",
                  tip: "Best for quickly populating a form from a news article. Always review the extracted data.",
                },
                {
                  name: "Summarize",
                  when: "When an entry has been submitted and you want a quick executive summary",
                  what: "Generates a 3–5 bullet point executive summary of the entry content, suitable for rapid review by UN leadership.",
                  tip: "The summary is stored alongside the entry and shown in the briefing view.",
                },
                {
                  name: "Reformulate",
                  when: "When refining the tone or wording of entry text",
                  what: "Rewrites selected text or the full entry in a formal UN diplomatic style — concise, neutral, and policy-appropriate.",
                  tip: "You can select specific text in the editor before clicking Reformulate to rewrite only that portion.",
                },
              ].map(({ name, when, what, tip }) => (
                <div
                  key={name}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-un-blue" />
                    <p className="font-semibold text-slate-800">{name}</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium text-slate-600">
                        When to use:{" "}
                      </span>
                      <span className="text-slate-700">{when}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-600">
                        What it does:{" "}
                      </span>
                      <span className="text-slate-700">{what}</span>
                    </p>
                    <p className="text-slate-500 italic">{tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Viewing & Managing */}
          <section id="viewing">
            <SectionHeading id="viewing" icon={List}>
              Viewing & Managing Entries
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              The <strong>View Entries</strong> page (
              <code className="rounded bg-slate-100 px-1 text-xs">/list</code>)
              shows all submitted entries across all briefing dates.
            </p>
            <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
              {[
                {
                  label: "Briefing Date filter",
                  desc: "Select a specific briefing date to see only entries for that day's morning meeting.",
                },
                {
                  label: "Region filter",
                  desc: "Filter entries by geographic region.",
                },
                {
                  label: "Priority filter",
                  desc: "Filter by SG's attention or Situational Awareness.",
                },
                {
                  label: "Search",
                  desc: "Full-text search across headlines, entry content, and countries.",
                },
              ].map(({ label, desc }) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="font-medium text-slate-800">{label}</p>
                  <p className="mt-1 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
            <InfoBox variant="blue">
              <strong>My Drafts</strong> (
              <code className="rounded bg-blue-100 px-1 text-xs">/drafts</code>)
              shows only your own unsubmitted draft entries. From there you can
              edit, submit, or delete each draft.
            </InfoBox>
          </section>

          {/* 8. Daily Briefing */}
          <section id="briefing">
            <SectionHeading id="briefing" icon={FileText}>
              The Daily Briefing
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              The briefing view (
              <code className="rounded bg-slate-100 px-1 text-xs">
                /briefing
              </code>
              ) compiles all approved entries for a given date into the Morning
              Meeting Update document.
            </p>
            <div className="mb-4 space-y-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-800">Document Structure</p>
                <p className="mt-1 text-slate-600">
                  Entries are grouped first by <strong>Region</strong>, then by{" "}
                  <strong>Country/Tag</strong>. Within each group, entries with
                  priority <em>SG's attention</em> appear before{" "}
                  <em>Situational Awareness</em>. A table of contents is
                  auto-generated.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-800">DOCX Export</p>
                <p className="mt-1 text-slate-600">
                  Click <em>Export Daily Briefing</em> to generate and download
                  a fully formatted Microsoft Word document. The document
                  includes the UN header, table of contents, all entry details,
                  PU notes, and source references.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-800">Email Sending</p>
                <p className="mt-1 text-slate-600">
                  The briefing can be emailed directly to a configured recipient
                  from the Settings → E-Mail Workflow tab. A scheduled send time
                  can be configured for automatic daily dispatch.
                </p>
              </div>
            </div>
            <InfoBox variant="amber">
              Only entries with <strong>Pending</strong> approval status appear
              in the briefing view for the selected date. Entries that have been
              postponed or are still in draft/submitted status are excluded.
            </InfoBox>
          </section>

          {/* 9. Analytics */}
          <section id="analytics">
            <SectionHeading id="analytics" icon={BarChart2}>
              Analytics
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              The Analytics Dashboard provides insights into entry patterns and
              regional activity over time.
            </p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                {
                  label: "Regional Distribution",
                  desc: "Bar chart showing total entries per region.",
                },
                {
                  label: "Category Distribution",
                  desc: "Breakdown of entries by document category.",
                },
                {
                  label: "Monthly Trends",
                  desc: "Line chart of entry volume over time.",
                },
                {
                  label: "Top Countries",
                  desc: "The 10 most frequently mentioned countries.",
                },
                {
                  label: "World Map",
                  desc: "Interactive globe showing geographic distribution of entries.",
                },
                {
                  label: "Regional Activity",
                  desc: "Heatmap of daily entry distribution by region.",
                },
              ].map(({ label, desc }) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="font-medium text-slate-800">{label}</p>
                  <p className="mt-1 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <InfoBox variant="blue">
                Use the <strong>Filters</strong> panel to narrow analytics by
                date range, region, or specific countries.
              </InfoBox>
            </div>
          </section>

          {/* 10. Settings & Administration */}
          <section id="settings">
            <SectionHeading id="settings" icon={Settings}>
              Settings & Administration
            </SectionHeading>
            <p className="mb-4 text-sm text-slate-700">
              Open Settings via the user menu (top right avatar). The settings
              dialog has four tabs.
            </p>
            <div className="space-y-3 text-sm">
              {[
                {
                  tab: "Account",
                  desc: "Update your first and last name, or permanently delete your account. Account deletion removes all your drafts.",
                },
                {
                  tab: "Data Management",
                  desc: "Download a full JSON backup of all entries, or import a backup file to restore entries. Duplicate entries are automatically skipped on import.",
                },
                {
                  tab: "User Management",
                  desc: "Add or remove @un.org email addresses from the registration whitelist. Only whitelisted emails can create accounts. Removing a registered user prevents them from logging in at their next session.",
                },
                {
                  tab: "E-Mail Workflow",
                  desc: "Configure the recipient email address and scheduled send time for automatic daily briefing emails.",
                },
              ].map(({ tab, desc }) => (
                <div
                  key={tab}
                  className="flex gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <span className="mt-0.5 w-32 shrink-0 text-xs font-semibold text-slate-500">
                    {tab}
                  </span>
                  <span className="text-slate-600">{desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 11. Quick Reference */}
          <section id="reference">
            <SectionHeading id="reference" icon={Table2}>
              Quick Reference
            </SectionHeading>

            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {(labels.categories as string[]).map((cat) => (
                    <Badge key={cat}>{cat}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Priorities
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    labels.priorities as Array<{
                      value: string;
                      label: string;
                    }>
                  ).map((p) => (
                    <Badge key={p.value}>{p.label}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Regions
                </p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left">Region</th>
                        <th className="px-4 py-2 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ["Africa", "All African nations and territories"],
                        [
                          "The Americas",
                          "North, Central, South America and the Caribbean",
                        ],
                        [
                          "Asia and the Pacific",
                          "East Asia, Southeast Asia, South Asia, and Pacific islands",
                        ],
                        ["Europe", "European nations and territories"],
                        ["Middle East", "Middle Eastern nations and the Gulf"],
                        [
                          "Thematic updates",
                          "Cross-regional or thematic entries not tied to a single region",
                        ],
                      ].map(([region, desc]) => (
                        <tr key={region} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-800">
                            {region}
                          </td>
                          <td className="px-4 py-2 text-slate-600">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Thematics
                </p>
                <div className="flex flex-wrap gap-2">
                  {(labels.form.options.thematics as string[]).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
              {labels.app.confidential}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
