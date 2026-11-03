import Image from 'next/image';
import Card from '@/components/ui/Card';

export default function LoginShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--surface)] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm space-y-5 p-6">
        <div className="-mx-6 -mt-6 rounded-t-[inherit] bg-[#00357f] px-6 py-4 flex justify-center">
          <Image src="/Logo_UNTELS.png" alt="Universidad Nacional Tecnológica de Lima Sur" width={3170} height={720} priority className="h-12 w-auto max-w-full" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">{title}</h1>
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
        </div>
        {children}
      </Card>
    </main>
  );
}
