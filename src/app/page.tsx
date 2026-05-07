import { redirect } from "next/navigation";

export default function Home() {
  // Erste Seite der App: Willkommen (Tour/Prinzipien/Demo). „Start“ führt dann zur Standardansicht.
  redirect("/willkommen");
}
