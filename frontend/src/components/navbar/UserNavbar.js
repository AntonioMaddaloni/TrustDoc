import Link from "next/link";
import { Button } from "@/components/ui/button";

// Questa è simile alla navbar che hai già creato
export default function UserNavbar({ user, onLogout }) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="font-medium text-gray-700">Dashboard</Link>
            <Link href="/documenti" className="font-medium text-gray-500">I miei documenti</Link>
            <Link href="/profilo" className="font-medium text-gray-500">Profilo</Link>
          </div>
          <div className="flex items-center space-x-4">
            <span>Benvenuto, {user.name}</span>
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}