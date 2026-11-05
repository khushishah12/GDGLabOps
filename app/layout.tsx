import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-provider';
import { ToastProvider } from '@/lib/toast-context';
import { UserProvider } from '@/lib/user-context';

export const metadata: Metadata = {
  title: 'GDG LabOps – Technical Workshop Infrastructure Platform',
  description:
    'Turn Technical Workshops Into Hands-On Experiences. Zero-install browser labs, automated evaluation, and live progress observability for Google Developer Groups.',
  applicationName: 'GDG LabOps',
  authors: [{ name: 'GDG on Campus' }],
  keywords: ['GDG', 'Developer Labs', 'Cloud Computing', 'Cybersecurity', 'Kubernetes', 'Linux', 'Workshops'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GDG LabOps',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-[#090d16] font-sans antialiased selection:bg-[#4285F4]/30 selection:text-[#4285F4]">
        <ThemeProvider defaultTheme="dark" storageKey="gdg-labops-theme">
          <UserProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
