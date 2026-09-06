import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CloudGPT | Production-Ready AI Platform",
  description: "Next.js + FastAPI + Hosted LLM Inference Platform with Document RAG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} h-full bg-slate-950 text-slate-100 antialiased overflow-hidden`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
