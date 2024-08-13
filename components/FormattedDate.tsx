import React from 'react';

type FormattedDateProps = {
  tweetTime: string;
};

const FormattedDate: React.FC<FormattedDateProps> = ({ tweetTime }) => {
  const tweetDate = new Date(tweetTime);
  const now = new Date();
  const diffInMonths =
    (now.getFullYear() - tweetDate.getFullYear()) * 12 + now.getMonth() - tweetDate.getMonth();

  let colorClass;
  if (diffInMonths > 11) {
    colorClass = 'text-red-500';
  } else if (diffInMonths < 3) {
    colorClass = 'text-green-500';
  } else {
    colorClass = 'text-yellow-400';
  }
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(tweetDate);

  return <span className={`${colorClass}`}>{formattedDate}</span>;
};

export default FormattedDate;
