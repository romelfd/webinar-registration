import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";

export const metadata = {
  title: "Webinar Registration",
  description: "Register for an upcoming webinar session",
};

// AppRouterCacheProvider wires MUI's Emotion styles into Next.js App Router's
// streaming SSR so styles don't flash unstyled on first paint — this is the
// one gotcha that trips people up combining MUI with the App Router.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
