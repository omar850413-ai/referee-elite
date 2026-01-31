export default function Footer() {
  return (
    <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-card">
      <p className="text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Soy Asesor. Todos los derechos reservados.
      </p>
      <nav className="sm:ml-auto flex gap-4 sm:gap-6">
        <a href="#" className="text-xs hover:underline underline-offset-4">
          Términos de Servicio
        </a>
        <a href="#" className="text-xs hover:underline underline-offset-4">
          Privacidad
        </a>
      </nav>
    </footer>
  );
}
