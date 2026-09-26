import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wheel Assemblers - Warehouse Shuttle Dashboard',
  description: 'Operations, Interlock & Maintenance Control for Automated High-Bay Racking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
