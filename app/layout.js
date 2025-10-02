
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script"; // <-- 1. Import the Script component

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TSRTC e-Ticket",
  description: "Onboard bus ticketing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        
        {/* 2. Replace the old <script> tag with the optimized <Script> component */}
        <Script 
          src="https://checkout.razorpay.com/v1/checkout.js" 
          strategy="lazyOnload" 
        />
      </body>
    </html>
  );
}
