import { Item } from '@/types/game';
import { calculateLevel, calculateNextLevelXP, calculateProgress } from '@/utils/game';
import { ItemUtils } from '@/utils/loot';
import { Box, LinearProgress, Typography } from '@mui/material';

interface ItemTooltipProps {
  item: Item;
  itemSpecialsSeed: number;
  style?: React.CSSProperties;
}

export default function ItemTooltip({ itemSpecialsSeed, item, style }: ItemTooltipProps) {
  const level = calculateLevel(item.xp);
  const tier = ItemUtils.getItemTier(item.id);
  const type = ItemUtils.getItemType(item.id);
  const metadata = ItemUtils.getMetadata(item.id);
  const xpToNextLevel = calculateNextLevelXP(level);
  const specials = ItemUtils.getSpecials(item.id, level, itemSpecialsSeed);
  const fullName = specials.suffix ? `${specials.prefix} ${specials.suffix} ${metadata.name}` : metadata.name;

  return (
    <Box sx={{ ...styles.tooltip, ...style }}>
      <Box sx={styles.header}>
        <Typography variant="body2" sx={styles.itemName}>
          {fullName}
        </Typography>
      </Box>

      <Box sx={styles.divider} />

      <Box sx={styles.statsContainer}>
        <Box sx={styles.statRow}>
          <Typography variant="caption" sx={styles.statLabel}>Power</Typography>
          <Typography variant="caption" sx={styles.statValue}>{level * (6 - tier)}</Typography>
        </Box>
        <Box sx={styles.statRow}>
          <Typography variant="caption" sx={styles.statLabel}>Level</Typography>
          <Typography variant="caption" sx={styles.statValue}>{level}</Typography>
        </Box>
        <Box sx={styles.statRow}>
          <Typography variant="caption" sx={styles.statLabel}>Type</Typography>
          <Typography variant="caption" sx={styles.statValue}>{type}</Typography>
        </Box>
      </Box>

      <Box sx={styles.xpContainer}>
        <Box sx={styles.xpHeader}>
          <Typography variant="caption" sx={styles.xpLabel}>XP Progress</Typography>
          <Typography variant="caption" sx={styles.xpValue}>{item.xp}/{xpToNextLevel}</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={calculateProgress(item.xp)}
          sx={styles.xpBar}
        />
      </Box>

      {specials.special1 && (
        <>
          <Box sx={styles.divider} />
          <Box sx={styles.specialContainer}>
            <Typography variant="caption" sx={styles.special}>
              {specials.special1}
            </Typography>

            <Typography variant="caption" sx={styles.special}>
              {ItemUtils.getStatBonus(specials.special1)}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}

const styles = {
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(17, 17, 17, 1)',
    border: '1px solid rgba(128, 255, 0, 0.3)',
    borderRadius: '8px',
    padding: '10px',
    zIndex: 1000,
    minWidth: '200px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  itemName: {
    color: '#80FF00',
    fontFamily: 'VT323, monospace',
    fontSize: '1.0rem',
    fontWeight: 'bold',
    textShadow: '0 0 8px rgba(128, 255, 0, 0.3)',
  },
  tier: {
    color: 'rgba(128, 255, 0, 0.7)',
    fontFamily: 'VT323, monospace',
    fontSize: '0.9rem',
    padding: '2px 6px',
    backgroundColor: 'rgba(128, 255, 0, 0.1)',
    borderRadius: '4px',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(to right, transparent, rgba(128, 255, 0, 0.3), transparent)',
    margin: '8px 0',
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '12px',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(128, 255, 0, 0.7)',
    fontFamily: 'VT323, monospace',
    fontSize: '0.9rem',
  },
  statValue: {
    color: '#80FF00',
    fontFamily: 'VT323, monospace',
    fontSize: '0.9rem',
    fontWeight: 'bold',
  },
  xpContainer: {
    marginBottom: '12px',
  },
  xpHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  xpLabel: {
    color: 'rgba(128, 255, 0, 0.7)',
    fontFamily: 'VT323, monospace',
    fontSize: '0.9rem',
  },
  xpValue: {
    color: '#80FF00',
    fontFamily: 'VT323, monospace',
    fontSize: '0.9rem',
  },
  xpBar: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'rgba(128, 255, 0, 0.1)',
    '& .MuiLinearProgress-bar': {
      backgroundColor: '#80FF00',
      boxShadow: '0 0 8px rgba(128, 255, 0, 0.5)',
    },
  },
  specialContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px',
  },
  special: {
    color: '#EDCF33',
    fontFamily: 'VT323, monospace',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
}; 