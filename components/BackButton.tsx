import { ArrowLeft } from 'lucide-react';

export const BackButton = () => (
  <button
    onClick={() => window.history.back()}
    className='flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors'
  >
    <ArrowLeft size={20} />
    <span className='text-lg'>Back</span>
  </button>
);
