export const metadata = {
  title: "ResinPlug API",
  description: "Backend API for ResinPlug e-commerce",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
