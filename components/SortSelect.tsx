import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortOption = {
  value: string;
  label: string;
  sortFn: (a: any, b: any) => number;
};

type SortSelectProps = {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
};

export const SortSelect = ({ options, value, onChange }: SortSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className='w-[200px] bg-gray-700 border-gray-600 text-gray-200'>
      <SelectValue placeholder='Sort by' />
    </SelectTrigger>
    <SelectContent className='bg-gray-700 border-gray-600'>
      {options.map((option) => (
        <SelectItem
          key={option.value}
          value={option.value}
          className='text-gray-200 focus:bg-gray-600 focus:text-gray-100'
        >
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
