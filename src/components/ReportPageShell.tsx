"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { ReportLanguage, StockReport } from "@/lib/analysis/report";
import ReportView from "./ReportView";

const STORAGE_KEY = "reportLanguage";
const LANGUAGE_CHANGE_EVENT = "reportLanguageChange";

const SHELL_COPY: Record<ReportLanguage, { dashboard: string; generated: string }> = {
  zh: {
    dashboard: "仪表盘",
    generated: "生成时间",
  },
  en: {
    dashboard: "Dashboard",
    generated: "Generated",
  },
};

function isReportLanguage(value: string | null): value is ReportLanguage {
  return value === "zh" || value === "en";
}

function getStoredLanguage(): ReportLanguage {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isReportLanguage(stored) ? stored : "zh";
}

function subscribeToLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

function getDefaultLanguage(): ReportLanguage {
  return "zh";
}

export default function ReportPageShell({ report }: { report: StockReport }) {
  const language = useSyncExternalStore<ReportLanguage>(subscribeToLanguage, getStoredLanguage, getDefaultLanguage);

  function selectLanguage(nextLanguage: ReportLanguage) {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }

  const copy = SHELL_COPY[language];

  return (
    <main className="min-h-screen bg-black p-3 text-zinc-100 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-yellow-400"
        >
          <ArrowLeft size={16} />
          {copy.dashboard}
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-right text-xs text-zinc-500">{copy.generated} {new Date(report.generatedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US")}</p>
          <div className="inline-grid grid-cols-2 border border-zinc-700 text-sm">
            {(["zh", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={language === option}
                onClick={() => selectLanguage(option)}
                className={`px-3 py-2 ${
                  language === option ? "bg-yellow-300 text-black" : "bg-black text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {option === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ReportView report={report} language={language} />
    </main>
  );
}
