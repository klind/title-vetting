import React from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const UrlInput: React.FC<UrlInputProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Enter domain name (e.g., legacytitleok.com)',
  disabled = false 
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
};

export default UrlInput;