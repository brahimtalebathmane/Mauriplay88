import type { ReactNode } from 'react';
import type { Platform } from '../types';
import { PlatformStorefrontCard, type PlatformStorefrontStats } from './PlatformStorefrontCard';

type PlatformItem = Platform & PlatformStorefrontStats;

type Props = {
  platforms: PlatformItem[];
  onSelectPlatform: (platformId: string) => void;
  loading?: boolean;
  emptyState?: ReactNode;
};

function SkeletonCards() {
  return (
    <div className="storefront-platform-grid" aria-hidden>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] rounded-card bg-white/5 animate-pulse border border-white/10"
        />
      ))}
    </div>
  );
}

export function PlatformStorefrontGrid({
  platforms,
  onSelectPlatform,
  loading = false,
  emptyState = null,
}: Props) {
  if (loading) {
    return <SkeletonCards />;
  }

  if (platforms.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="storefront-platform-grid">
      {platforms.map((platform) => (
        <PlatformStorefrontCard
          key={platform.id}
          platform={platform}
          onSelect={onSelectPlatform}
        />
      ))}
    </div>
  );
}
