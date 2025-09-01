import { useDynamicConnector } from "@/contexts/starknet";
import { ChainId } from '@/utils/networkConfig';
import { getContractByName } from "@dojoengine/core";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TheatersIcon from '@mui/icons-material/Theaters';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Button, IconButton, Pagination, Typography } from "@mui/material";
import { motion } from "framer-motion";
import {
  useSubscribeGameTokens
} from "metagame-sdk";
import { useNavigate } from "react-router-dom";
import { addAddressPadding } from "starknet";

interface LeaderboardProps {
  onBack: () => void;
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const navigate = useNavigate();
  const { currentNetworkConfig } = useDynamicConnector();

  const handleChange = (event: any, newValue: number) => {
    goToPage(newValue - 1);
  };

  const GAME_TOKEN_ADDRESS = getContractByName(
    currentNetworkConfig.manifest,
    currentNetworkConfig.namespace,
    "game_token_systems"
  )?.address;

  const {
    games,
    pagination: {
      currentPage,
      totalPages,
      goToPage,
    },
  } = useSubscribeGameTokens({
    pagination: {
      pageSize: 10,
      sortBy: "score",
      sortOrder: "desc",
    },
    minted_by_address: currentNetworkConfig.chainId === ChainId.WP_PG_SLOT ? GAME_TOKEN_ADDRESS : addAddressPadding(currentNetworkConfig.dungeon),
    settings_id: currentNetworkConfig.chainId === ChainId.WP_PG_SLOT ? 0 : undefined,
  });

  const watchGame = (gameId: number) => {
    navigate(`/survivor/watch?id=${gameId}`);
  };

  return (
    <motion.div
      key="adventurers-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ width: "100%" }}
    >
      <Box sx={styles.adventurersHeader}>
        <Button
          variant="text"
          onClick={onBack}
          sx={styles.backButton}
          startIcon={<ArrowBackIcon />}
        >
          Leaderboard
        </Button>
      </Box>

      <Box sx={styles.listContainer}>
        {(!games || games.length === 0) ? (
          <Typography sx={{ textAlign: "center", py: 2 }}>
            Loading...
          </Typography>
        ) : games.map((game: any, index: number) => (
          <motion.div
            key={game.token_id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 1,
              delay: index * 0.1,
            }}
          >
            <Box sx={styles.listItem}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  maxWidth: "30vw",
                  flex: 1,
                }}
              >
                <Box textAlign={'center'} width='20px'>
                  <Typography>{currentPage * 10 + index + 1}.</Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    textAlign: "left",
                    overflow: "hidden",
                  }}
                >
                  <Typography
                    color="primary"
                    lineHeight={1}
                    sx={{
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                      overflow: "hidden",
                    }}
                  >
                    {game.player_name}
                  </Typography>
                  <Typography
                    color="secondary"
                    sx={{ fontSize: "12px", opacity: 0.8 }}
                  >
                    ID: #{game.token_id}
                  </Typography>
                </Box>
              </Box>

              <Box textAlign={'center'} display={'flex'} alignItems={'center'} gap={1}>
                <Typography>{game.score} xp</Typography>

                <Box textAlign={'center'}>
                  {game.game_over && <IconButton onClick={() => watchGame(game.token_id)}>
                    <TheatersIcon fontSize='small' color='primary' />
                  </IconButton>}

                  {!game.game_over && <IconButton onClick={() => watchGame(game.token_id)}>
                    <VisibilityIcon fontSize='small' color='primary' />
                  </IconButton>}
                </Box>
              </Box>
            </Box>
          </motion.div>
        ))}

        {games.length > 0 && <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', my: '2px' }}>
          <Pagination count={totalPages} shape="rounded" color='primary' size='small' page={currentPage + 1} onChange={handleChange} />
        </Box>}
      </Box>
    </motion.div>
  );
}

const styles = {
  adventurersHeader: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    mb: 1,
  },
  backButton: {
    minWidth: "auto",
    px: 1,
  },
  listContainer: {
    width: "100%",
    maxHeight: "550px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    overflowY: "auto",
    pr: 0.5,
  },
  listItem: {
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 3,
    px: "5px !important",
    pl: "8px !important",
    flexShrink: 0,
    background: "rgba(24, 40, 24, 0.3)",
    border: "1px solid rgba(8, 62, 34, 0.5)",
    borderRadius: "4px",
  },
};
