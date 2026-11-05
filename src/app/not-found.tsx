import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-x flex min-h-[100svh] flex-col items-start justify-center gap-8">
      <span className="eyebrow">404</span>
      <h1 className="display">
        Diese Seite <em>fehlt im Dex.</em>
      </h1>
      <Link href="/" className="btn btn-primary">
        Zur Startseite
      </Link>
    </main>
  );
}
