import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GanttPro — Gestión de Proyectos",
  description: "Sistema colaborativo de planificación y administración de trabajo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
