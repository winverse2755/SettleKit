'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettlementDetail, type Settlement } from '@/components/settlements/settlement-detail';

async function fetchSettlement(id: string): Promise<Settlement> {
  const res = await fetch(`/api/backend/settlement/${id}`);
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 404) throw new Error('Settlement not found');
    const hint =
      data?.hint ||
      'Ensure skit-backend is running on port 3001 or your ngrok tunnel is active.';
    throw new Error(`Backend unavailable. ${hint}`);
  }
  return data;
}

export default function SettlementDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: settlement, isLoading, error } = useQuery({
    queryKey: ['settlement', id],
    queryFn: () => fetchSettlement(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex items-center justify-center py-24">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <p>{error ? String(error) : 'Settlement not found'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/settlements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settlements
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <SettlementDetail settlement={settlement} />;
}
