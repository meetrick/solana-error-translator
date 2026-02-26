"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisResult {
  status: "success" | "error_found" | "error_unknown" | "error_unparsed";
  message: string;
  // present when status === "error_found" | "error_unknown"
  program_id?: string;
  program_name?: string;
  error_code?: string;
  // present when status === "error_found"
  name?: string;
  // present when status === "error_unparsed"
  raw_logs?: string[];
  // present when status === "error_unknown"
  raw_log?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 text-zinc-400">
      <svg
        className="h-5 w-5 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
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
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      <span>Fetching transaction…</span>
    </div>
  );
}

function ResultCard({ result }: { result: AnalysisResult }) {
  if (result.status === "success") {
    return (
      <div className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-6">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-emerald-400">
          Transaction Successful
        </p>
        <p className="text-zinc-300">{result.message}</p>
      </div>
    );
  }

  if (result.status === "error_found") {
    return (
      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-6 space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-amber-400">
            Error Identified
          </p>
          {result.program_name && (
            <p className="text-xs text-zinc-500">
              Program:{" "}
              <span className="font-mono text-zinc-400">
                {result.program_name}
              </span>{" "}
              <span className="text-zinc-600">({result.program_id})</span>
            </p>
          )}
        </div>

        <div className="rounded-lg bg-zinc-900 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
            Error Name
          </p>
          <p className="font-mono text-amber-300">
            {result.name}{" "}
            <span className="text-zinc-600 text-sm">({result.error_code})</span>
          </p>
        </div>

        <div className="rounded-lg bg-zinc-900 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
            What This Means
          </p>
          <p className="text-zinc-200 leading-relaxed">{result.message}</p>
        </div>
      </div>
    );
  }

  if (result.status === "error_unknown") {
    return (
      <div className="rounded-xl border border-orange-700 bg-orange-950/40 p-6 space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-orange-400">
            Unknown Error
          </p>
          {result.program_name && (
            <p className="text-xs text-zinc-500">
              Program:{" "}
              <span className="font-mono text-zinc-400">
                {result.program_name}
              </span>{" "}
              <span className="text-zinc-600">({result.program_id})</span>
            </p>
          )}
        </div>

        <p className="text-zinc-300">{result.message}</p>

        {result.raw_log && (
          <div className="rounded-lg bg-zinc-900 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
              Raw Error Log
            </p>
            <pre className="whitespace-pre-wrap break-all font-mono text-xs text-zinc-400">
              {result.raw_log}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // status === "error_unparsed"
  return (
    <div className="rounded-xl border border-red-800 bg-red-950/40 p-6 space-y-4">
      <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-red-400">
        Transaction Failed
      </p>
      <p className="text-zinc-300">{result.message}</p>

      {result.raw_logs && result.raw_logs.length > 0 && (
        <div className="rounded-lg bg-zinc-900 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            Raw Transaction Logs
          </p>
          <ul className="space-y-1">
            {result.raw_logs.map((line, i) => (
              <li
                key={i}
                className="font-mono text-xs text-zinc-400 break-all"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [signature, setSignature] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    setAnalysisResult(null);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signature: signature.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail ?? `Server error: ${response.status} ${response.statusText}`;
        throw new Error(detail);
      }

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        // fetch itself failed — backend is likely not running
        setError(
          "Could not reach the backend. Make sure the FastAPI server is running on http://localhost:8000."
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-16">
      <div className="mx-auto w-full max-w-2xl space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Solana Error Translator
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Paste a failed Solana transaction signature below to get a
            plain-English explanation of what went wrong.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAnalyze} className="space-y-3">
          <label
            htmlFor="signature"
            className="block text-sm font-medium text-zinc-400"
          >
            Transaction Signature
          </label>
          <input
            id="signature"
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="e.g. 5UfgJ5vVZxUxefDGqzqkVLHmNwYQrMtZm…"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
          />
          <button
            type="submit"
            disabled={isLoading || signature.trim() === ""}
            className="w-full rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze Transaction
          </button>
        </form>

        {/* Results area */}
        <div className="min-h-[4rem]">
          {isLoading && <Spinner />}

          {!isLoading && error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-5 py-4 text-red-400">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!isLoading && !error && analysisResult && (
            <ResultCard result={analysisResult} />
          )}
        </div>
      </div>
    </main>
  );
}
