import ReportPageShell from "@/components/ReportPageShell";
import { getStockReport } from "@/lib/services/stockData";

type ReportPageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { symbol } = await params;
  const report = await getStockReport(symbol);

  return <ReportPageShell report={report} />;
}
