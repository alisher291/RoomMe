import type { Metadata } from "next";
import { DemoProvider } from "@/components/DemoProvider";
import { Shell } from "@/components/Shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "RoommateMatch | Find your kind of home",
  description:
    "Find a NYC flat, compare living habits, and talk through the details in a roommate matching demo.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>
          <Shell>{children}</Shell>
        </DemoProvider>
      </body>
    </html>
  );
}
