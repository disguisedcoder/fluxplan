"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EventLogExportButton({ format }: { format: "json" | "csv" }) {
  return (
    <a
      href={`/api/export?format=${format}`}
      className="inline-flex"
      target="_blank"
      rel="noreferrer"
    >
      <Button variant={format === "json" ? "default" : "outline"} className="gap-2">
        <Download className="h-4 w-4" />
        Export {format.toUpperCase()}
      </Button>
    </a>
  );
}

