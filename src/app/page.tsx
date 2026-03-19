"use client";

import { useState } from "react";

interface ScrapeResult {
  data: Record<string, unknown>[];
  rawText: string;
}

function jsonToCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = String(row[h] ?? "");
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function handleScrape() {
    setError("");
    setResult(null);
    setCopied(false);

    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe what data you want to extract.");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (include https://).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, description }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong.");
        return;
      }
      setResult(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyJson() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadCsv() {
    if (!result) return;
    const csv = jsonToCsv(result.data);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scraped_data.csv";
    a.click();
  }

  return (
    <main className="flex flex-col items-center px-4 py-12 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
            AI Web Scraper
          </h1>
          <p className="text-zinc-400 text-sm">
            Enter a URL and describe what data you want. AI extracts structured
            JSON from any webpage.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              URL
            </label>
            <input
              id="url"
              type="url"
              placeholder="https://example.com/products"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition"
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              What data do you want?
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="e.g. product names, prices, and ratings"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition resize-none"
            />
          </div>
          <button
            onClick={handleScrape}
            disabled={loading}
            className="w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Scraping & Extracting...
              </span>
            ) : (
              "Scrape & Extract"
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCopyJson}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
              >
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button
                onClick={handleDownloadCsv}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
              >
                Download CSV
              </button>
            </div>

            {/* Table */}
            {result.data.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900">
                      {Object.keys(result.data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left font-medium text-zinc-300"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                      >
                        {Object.values(row).map((val, j) => (
                          <td
                            key={j}
                            className="px-4 py-3 text-zinc-200 max-w-xs truncate"
                          >
                            {String(val ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Raw Text */}
            <div className="rounded-xl border border-zinc-800">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                <span>Raw Extracted Text</span>
                <svg
                  className={`h-4 w-4 transition-transform ${showRaw ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showRaw && (
                <pre className="px-4 pb-4 text-xs text-zinc-500 whitespace-pre-wrap max-h-64 overflow-y-auto font-[family-name:var(--font-geist-mono)]">
                  {result.rawText}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600">
          Powered by Groq &middot; llama-3.3-70b-versatile
        </p>
      </div>
    </main>
  );
}
