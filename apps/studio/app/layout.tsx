import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic AI Lab — Learn by Building",
  description:
    "A complete learning platform for production-grade Agentic AI — TypeScript, Python, Java. LangGraph, Google ADK 2.0, Embabel, MCP, A2A v1.0 and every orchestration pattern, live in a BPMN-style studio.",
  openGraph: {
    title: "Agentic AI Lab",
    description: "Build and learn every Agentic AI pattern — TS, Python, Java",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
