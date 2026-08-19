export const ggrColor = (value: number): 'green' | 'red' | undefined => {
  if (value > 0) {
    return 'green';
  }

  if (value < 0) {
    return 'red';
  }

  return undefined;
};
