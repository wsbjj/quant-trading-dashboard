import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReportView from "@/components/ReportView";
import { getStockReport } from "@/lib/services/stockData";

type ReportPageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { symbol } = await params;
  const report = await getStockReport(symbol);

  return (
    <main className="min-h-screen bg-black p-3 text-zinc-100 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-yellow-400"
        >
          <ArrowLeft size={16} />
          仪表盘
        </Link>
        <p className="text-right text-xs text-zinc-500">Generated {new Date(report.generatedAt).toLocaleString()}</p>
      </div>
      <ReportView report={report} />
    </main>
  );
}
