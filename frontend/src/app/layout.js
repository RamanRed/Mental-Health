import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'MANAS - Mental Health Access & Navigation Assistant',
  description: 'A comprehensive mental health platform providing accessible, compassionate, and technology-driven mental health support for rural and underserved communities.',
  keywords: 'mental health, wellness, MANAS, healthcare, rural health',
  authors: [{ name: 'MANAS Team' }],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
