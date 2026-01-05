export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-600">
      <p>© {currentYear} United Nations. All rights reserved.</p>
    </footer>
  );
}
