type PlayerRoundStatus = 'won' | 'lost' | 'active' | 'failed';

export const formatPlayerRoundStatusLabel = (
  status: PlayerRoundStatus,
): string => {
  switch (status) {
    case 'won':
      return 'Won';
    case 'lost':
      return 'Lost';
    case 'active':
      return 'In progress';
    case 'failed':
      return 'Failed';
  }
};

export const playerRoundStatusColor = (
  status: PlayerRoundStatus,
): 'green' | 'red' | 'blue' | 'orange' => {
  switch (status) {
    case 'won':
      return 'green';
    case 'lost':
      return 'red';
    case 'active':
      return 'blue';
    case 'failed':
      return 'orange';
  }
};
