import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RegPilot — Regulatory Reporting AI Console",
  description:
    "Small-model triage, guardrails and confidence gating with Azure OpenAI for regulatory reporting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-100 font-sans text-stone-900">
        <div className="min-h-screen md:flex">
          <aside className="w-full shrink-0 bg-slate-900 px-4 py-4 text-slate-200 md:w-60 md:px-5 md:py-6">
            <div className="mb-4 md:mb-6">
              <div className="text-lg font-bold tracking-tight text-white">
                RegPilot
              </div>
              <div className="text-xs text-slate-400">
                Regulatory Reporting AI Console
              </div>
              <div className="mt-2 inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                Jev small-model pattern
              </div>
            </div>
            <Nav />
            <div className="mt-6 hidden text-[11px] leading-relaxed text-slate-500 md:block">
              Small model triages, guards and scores. Azure OpenAI drafts. Humans
              decide. Every step is audited.
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
