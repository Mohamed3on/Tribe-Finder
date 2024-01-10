import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';

import {
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent,
  CardFooter,
  Card,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import * as z from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Cross1Icon } from '@radix-ui/react-icons';

const formSchema = z.object({
  twitterHandle: z
    .string({
      required_error: 'Please enter your Twitter handle.',
    })
    .min(2)
    .max(50),
  listIDs: z
    .array(
      z.object({
        value: z.string().refine((val) => /^\d+$/.test(val), {
          message: 'List IDs must be strings of numbers only.',
        }),
      })
    )
    .optional(),
});

export const Config = ({
  onDataSubmit,
  initialData,
}: {
  onDataSubmit: (data: z.infer<typeof formSchema>) => void;
  initialData?: z.infer<typeof formSchema>;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      twitterHandle: '',
      listIDs: [
        {
          value: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: 'listIDs',
    control: form.control,
  });

  useEffect(() => {
    // Reset the form with initial data
    form.reset(initialData);

    // Replace all fields in a single operation
    const newFields = initialData?.listIDs?.map((item) => ({ value: item.value })) || [
      { value: '' },
    ];
    form.setValue('listIDs', newFields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  function onSubmit(data: z.infer<typeof formSchema>) {
    onDataSubmit(data);
    toast('Your data has been saved!', {
      description: 'head to twitter.com and come back again to see where your friends live!',
    });
  }

  return (
    <div className='flex justify-center items-center'>
      <Card className='w-full max-w-screen-xl p-4 mx-auto text-gray-200 shadow-lg rounded-lg'>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>Enter your Twitter handle below.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='twitterHandle'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter handle</FormLabel>
                    <FormControl>
                      <Input placeholder='mohamed3on' className='max-w-96' {...field} />
                    </FormControl>
                    <FormDescription>
                      {`This is the twitter username whose friends' locations you want to track
                      (Usually that's yours)`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                {fields.map((field, index) => (
                  <FormField
                    control={form.control}
                    key={field.id}
                    name={`listIDs.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(index !== 0 && 'sr-only')}>
                          List IDs (Optional)
                        </FormLabel>
                        <FormDescription className={cn(index !== 0 && 'sr-only')}>
                          Add IDs of lists whose members you also want to track
                        </FormDescription>
                        <div className='flex gap-3'>
                          <FormControl>
                            <Input className='max-w-96' {...field} />
                          </FormControl>
                          <Button variant='destructive' size='icon' onClick={() => remove(index)}>
                            <Cross1Icon className='h-4 w-4' />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='mt-2'
                  onClick={() => append({ value: '' })}
                >
                  Add List ID
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button type='submit' className='ml-auto'>
                Save
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};
