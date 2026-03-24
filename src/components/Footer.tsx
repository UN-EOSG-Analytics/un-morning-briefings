import labels from "@/lib/labels.json";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white px-4 py-8 text-center text-sm text-slate-400">
      <p>{labels.app.copyright.replace("{year}", String(currentYear))}</p>
    </footer>
  );
}
