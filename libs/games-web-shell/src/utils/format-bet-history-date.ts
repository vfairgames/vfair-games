import dayjs from 'dayjs';

export const formatBetHistoryDate = (
  timestamp: number,
): { date: string; time: string } => {
  const value = dayjs(timestamp);

  return {
    date: value.format('YYYY-MM-DD'),
    time: value.format('HH:mm'),
  };
};
