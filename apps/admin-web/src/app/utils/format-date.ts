import dayjs from 'dayjs';

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDateParam = (value?: dayjs.ConfigType) =>
  dayjs(value).format('YYYY-MM-DD');

export const dateRangeForLastDays = (days: number) => {
  const dateTo = dayjs();
  const dateFrom = dateTo.subtract(days - 1, 'day');

  return {
    dateFrom: formatDateParam(dateFrom),
    dateTo: formatDateParam(dateTo),
  };
};

export const isDateRangeOrdered = (dateFrom: string, dateTo: string): boolean =>
  Boolean(dateFrom && dateTo && dateFrom <= dateTo);
