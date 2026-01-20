import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "trak - CRM za vaš biznis",
  description: "Moderan CRM sistem za upravljanje kontaktima i prodajom",
  icons: {
    icon: "/favicon.png",
    apple: "/trak-logo.png",
  },
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
