import labels from "@/lib/labels.json";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-sm text-slate-600">
      <p>{labels.app.copyright.replace("{year}", String(currentYear))}</p>
    </footer>
  );
}
