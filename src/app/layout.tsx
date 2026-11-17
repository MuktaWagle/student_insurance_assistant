import './globals.css';
export const metadata = {
  title: 'StudentCare · NUS care to claim',
  description: 'A student care and insurance navigation prototype',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
