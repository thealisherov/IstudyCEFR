import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "iSTUDY Mock Exam Platform — Professional Prep",
  description: "A premium full-stack CEFR mock testing platform. Practice Listening, Reading, and Writing sections under real exam conditions.",
  keywords: ["CEFR", "Mock Exam", "IELTS", "English Practice", "Listening", "Reading", "Writing"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  }>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
