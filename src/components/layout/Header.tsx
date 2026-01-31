import Link from 'next/link';
import { Mountain } from 'lucide-react';

export default function Header() {
  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-card border-b">
      <Link href="/" className="flex items-center justify-center">
        <Mountain className="h-6 w-6" />
        <span className="sr-only">Mi App</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        <Link
          href="#"
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          Inicio
        </Link>
        <Link
          href="#"
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          Acerca de
        </Link>
        <Link
          href="#"
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          Contacto
        </Link>
      </nav>
    </header>
  );
}
