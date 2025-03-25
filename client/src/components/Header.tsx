import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-xl font-semibold cursor-pointer">Deployment Slot Booking</h1>
        </Link>
        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <a className={`text-white hover:text-blue-100 transition-colors ${location === '/' ? 'font-medium' : ''}`}>
                Weekly Slots
              </a>
            </Link>
            <Link href="/dashboard">
              <a className={`text-white hover:text-blue-100 transition-colors ${location === '/dashboard' ? 'font-medium' : ''}`}>
                Dashboard
              </a>
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <span className="text-sm hidden md:inline-block">Welcome, Team</span>
            <Button variant="secondary" size="sm" className="text-primary bg-white hover:bg-blue-50">
              <HelpCircle className="h-4 w-4 mr-1" />
              <span>Help</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
