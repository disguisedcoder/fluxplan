import * as XLSX from "xlsx";

import {
  adminExportCsvRows,
  type AdminAllUsersExport,
  type AdminCsvSheet,
} from "@/lib/export/build-user-export";

const ADMIN_EXPORT_SHEETS: { sheet: AdminCsvSheet; tabName: string }[] = [
  { sheet: "teilnehmer", tabName: "Teilnehmer" },
  { sheet: "vorschlaege", tabName: "Vorschläge" },
  { sheet: "vorschlag_reaktionen", tabName: "Annahmen_Ablehnungen" },
  { sheet: "interaktionen", tabName: "Interaktionen" },
  { sheet: "sessions", tabName: "Sessions" },
];

/** Ein Excel-Workbook mit je einem Tab pro Auswertungstabelle. */
export function adminExportToXlsxBuffer(bundle: AdminAllUsersExport): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const { sheet, tabName } of ADMIN_EXPORT_SHEETS) {
    const rows = adminExportCsvRows(bundle, sheet);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, tabName.slice(0, 31));
  }

  const readme = XLSX.utils.aoa_to_sheet([
    ["FluxPlan Studien-Export"],
    ["exportiert", bundle.exportedAt],
    ["Teilnehmer", String(bundle.participantCount)],
    [],
    ["Tab", "Inhalt"],
    ...ADMIN_EXPORT_SHEETS.map(({ tabName, sheet }) => [tabName, sheet]),
    [],
    [bundle.readme],
  ]);
  XLSX.utils.book_append_sheet(workbook, readme, "README");

  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }),
  );
}
