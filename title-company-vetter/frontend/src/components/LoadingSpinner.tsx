import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
  );
};

export default LoadingSpinner;