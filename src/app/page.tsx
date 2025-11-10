
'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-background shadow-sm">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <span className="text-2xl font-black tracking-tighter text-primary-dark [text-shadow:1px_1px_0px_hsl(var(--muted-foreground)),2px_2px_0px_hsl(var(--secondary))]">
            ⚽ Soy Asesor FMF ⚽
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Iniciar Sesión
          </Link>
          <Link href="/signup" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" prefetch={false}>
            Registrarse
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-blue-100 via-white to-blue-50 dark:from-blue-900/10 dark:via-background dark:to-blue-900/5">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary-dark">
                    La Herramienta Definitiva para Asesores de Árbitros
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Gestiona cada detalle del partido en tiempo real. Desde goles y tarjetas hasta sustituciones y faltas, todo en una interfaz intuitiva y fácil de usar.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link
                    href="/referee"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    prefetch={false}
                  >
                    Ir a la App <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
              <Image
                src="https://picsum.photos/seed/referee-app/600/400"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="soccer referee technology"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-xl"
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Soy Asesor FMF. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
