import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trak - CRM za vaš biznis",
  description: "Moderan CRM sistem za upravljanje kontaktima i prodajom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
