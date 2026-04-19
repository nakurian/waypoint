export default function PhaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container flex gap-8 py-8">
      {children}
    </div>
  );
}
