import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TSRTC e-Ticket",
  description: "Onboard bus ticketing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Google AdSense Site Verification */}
        <meta
          name="google-adsense-account"
          content="ca-pub-2857185037271678"
        />
      </head>

      <body className={inter.className}>
        {children}

        {/* ✅ Razorpay Checkout Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
