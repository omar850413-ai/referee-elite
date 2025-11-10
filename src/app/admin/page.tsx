
import { Button } from '@/components/ui/button';
import UserManagement from '@/components/admin/UserManagement';
import { LogOut, Home } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-primary">
              Panel de Administración
            </h1>
            <div className="flex items-center gap-4">
               <Button asChild variant="outline" size="sm">
                <Link href="/referee">
                  <Home className="mr-2 h-4 w-4" />
                  App Principal
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <UserManagement />
      </main>
    </div>
  );
}
