import SharedHeader from '../components/SharedHeader';
import SharedFooter from '../components/SharedFooter';

export default function SettlementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background dark">
      <SharedHeader />
      <main className="flex-1">{children}</main>
      <SharedFooter />
    </div>
  );
}
