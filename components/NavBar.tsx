import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useTwitterHandleContext } from '@/lib/StorageContext';

export const NavBar = ({ userName }: { userName: string }) => {
  const { forceRefresh } = useTwitterHandleContext();

  return (
    <div className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-4'>
      <nav className='flex justify-between items-center p-4'>
        <div className='flex items-center'>
          <img
            src='/logo.svg'
            alt='Logo'
            onClick={() => {
              window.location.href = '/index.html';
            }}
            className='h-10 w-10 hover:opacity-80 transition-opacity ease-in-out duration-300 cursor-pointer'
          />
        </div>

        <div className='flex items-center gap-4'>
          {userName !== 'Config' && (
            <Button
              variant='ghost'
              size='sm'
              onClick={forceRefresh}
              className='gap-2 text-foreground/60 hover:text-foreground/80'
            >
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
          )}
          <div className='flex items-center text-base'>
            <a
              href='#config'
              className='hover:text-foreground/80 text-foreground/60 transition-colors ease-in-out duration-200'
            >
              {userName}
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
};
