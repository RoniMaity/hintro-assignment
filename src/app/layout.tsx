import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";

export const metadata: Metadata = {
  title: "Meeting Intelligence | Hintro",
  description: "AI-powered meeting transcript analysis with action item tracking, citation grounding, and real-time notifications.",
  keywords: ["meeting intelligence", "transcript analysis", "action items", "AI", "meeting notes"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
