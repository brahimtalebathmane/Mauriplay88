export const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="bg-gray-900 rounded-lg p-4 animate-pulse">
      <div className="w-full aspect-square bg-gray-800 rounded-lg mb-3" />
      <div className="h-4 bg-gray-800 rounded w-3/4 mx-auto mb-2" />
      <div className="h-3 bg-gray-800 rounded w-1/2 mx-auto" />
    </div>
  );
};

export const SkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gray-900 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
};
