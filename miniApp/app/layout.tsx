import './globals.css';

export const metadata = {
  title: 'Scholarship Pilot Review',
  description: 'Review your AI-drafted application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  );
}