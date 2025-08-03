import { Inter } from "next/font/google"
import "../app/globals.css" // Assicurati che il percorso sia corretto per src/app/globals.css
import { AuthProvider } from "@/contexts/AuthContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "My App",
  description: "Authentication App with Next.js",
}

export default function RootLayout({ children }) {
  console.log("RootLayout: Rendering with AuthProvider.")
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}