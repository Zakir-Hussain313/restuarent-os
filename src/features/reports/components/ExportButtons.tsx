"use client";

import { useCallback, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportResult =
  | { data: string; filename: string; error?: undefined }
  | { data: null; error: string };

interface ExportButtonsProps {
  onExportExcel: () => Promise<ExportResult>;
  onExportPdf: () => Promise<ExportResult>;
}

function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({ onExportExcel, onExportPdf }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportExcel = useCallback(async () => {
    setIsExporting("excel");
    setExportError(null);
    const result = await onExportExcel();
    if (result.data === null) {
      setExportError(result.error);
    } else {
      downloadBase64File(
        result.data,
        result.filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    }
    setIsExporting(null);
  }, [onExportExcel]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting("pdf");
    setExportError(null);
    const result = await onExportPdf();
    if (result.data === null) {
      setExportError(result.error);
    } else {
      downloadBase64File(result.data, result.filename, "application/pdf");
    }
    setIsExporting(null);
  }, [onExportPdf]);

  return (
    <div className="space-y-3">
      {exportError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {exportError}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting !== null}>
          {isExporting === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting !== null}>
          {isExporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export PDF
        </Button>
      </div>
    </div>
  );
}