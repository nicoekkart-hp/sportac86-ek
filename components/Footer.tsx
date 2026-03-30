import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-dark text-gray-sub py-7 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          © 2025 Sportac 86 Deinze — EK Ropeskipping Noorwegen
        </p>
        <div className="flex gap-6">
          <Link href="/contact" className="text-sm hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/privacy" className="text-sm hover:text-white transition-colors">
            Privacy
          </Link>
          <a
            href="https://sportac86.be"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:text-white transition-colors"
          >
            Sportac86.be ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
