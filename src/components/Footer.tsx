export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-sm text-slate-600">
      <p>© {currentYear} United Nations. All rights reserved.</p>
    </footer>
  );
}
