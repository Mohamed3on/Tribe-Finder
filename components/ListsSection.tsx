import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLocationContext } from '@/lib/LocationContext';
import { excludeList, removeListExclusion, setEnableLists, useStorage } from '@/lib/storage';
import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';

export const ListsSection = () => {
  const { userListData } = useLocationContext();

  const enableLists = useStorage('enableLists');
  const excludedLists = useStorage('excludedLists');

  if (userListData.length === 0) return null;

  if (!enableLists) {
    return (
      <div className='mb-4'>
        <p className='text-center text-gray-500 text-xs'>
          Tip: You can
          <Button
            variant='link'
            className='p-1 text-xs'
            onClick={(e) => {
              e.preventDefault();
              setEnableLists(true);
            }}
          >
            include
          </Button>
          members of your lists in the results
        </p>
      </div>
    );
  }
  return (
    <Accordion type='single' collapsible className='mb-3'>
      <AccordionItem value='item-1'>
        <AccordionTrigger className='justify-start gap-2'>Included lists</AccordionTrigger>
        <AccordionContent>
          <div className='flex flex-row items-center space-x-3 mb-4 flex-wrap gap-2'>
            {userListData.map((list) => (
              <div key={list.id} className='flex items-center'>
                <div className='rounded-full bg-gray-200  p-2 flex justify-between items-center gap-1 pr-2'>
                  <Checkbox
                    id={`list-${list.id}`}
                    name={`list-${list.id}`}
                    checked={!excludedLists.includes(list.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        removeListExclusion(list.id);
                      } else {
                        excludeList(list.id);
                      }
                    }}
                  />
                  <label
                    htmlFor={`list-${list.id}`}
                    className='text-sm font-semibold text-gray-800'
                  >
                    {list.name}
                  </label>

                  <Avatar className='h-6 w-6'>
                    <AvatarImage src={list.avatar} />
                  </Avatar>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant='ghost'
            className=' mt-2 text-blue-500 hover:text-blue-400 active:text-blue-600 transition-colors ease-in-out'
            onClick={(e) => {
              e.preventDefault();
              setEnableLists(false);
            }}
          >
            Want to exclude them all?
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
