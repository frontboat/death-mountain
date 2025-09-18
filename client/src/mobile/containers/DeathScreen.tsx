import { BEAST_NAMES } from "@/constants/beast";
import { OBSTACLE_NAMES } from "@/constants/obstacle";
import { useDynamicConnector } from "@/contexts/starknet";
import { useGameStore } from "@/stores/gameStore";
import { useAnalytics } from "@/utils/analytics";
import { screenVariants } from "@/utils/animations";
import { ChainId } from "@/utils/networkConfig";
import { getContractByName } from "@dojoengine/core";
import { Box, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useGameTokenRanking } from "metagame-sdk/sql";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addAddressPadding } from "starknet";

export default function DeathScreen() {
  const { currentNetworkConfig } = useDynamicConnector();
  const {
    gameId,
    exploreLog,
    battleEvent,
    beast,
    quest,
    adventurer,
  } = useGameStore();
  const navigate = useNavigate();
  const { playerDiedEvent } = useAnalytics();

  let collectableCount = parseInt(localStorage.getItem(`beast_collected_${gameId}`) || "0");

  const finalBattleEvent =
    battleEvent || exploreLog.find((event) => event.type === "obstacle");

  let battleMessage = "";
  if (finalBattleEvent?.type === "obstacle") {
    battleMessage = `${OBSTACLE_NAMES[finalBattleEvent.obstacle?.id!]
      } hit your ${finalBattleEvent.obstacle?.location} for ${finalBattleEvent.obstacle?.damage
      } damage ${finalBattleEvent.obstacle?.critical_hit ? "CRITICAL HIT!" : ""}`;
  } else if (finalBattleEvent?.type === "beast_attack") {
    battleMessage = `${BEAST_NAMES[beast?.id!]} attacked your ${battleEvent?.attack?.location
      } for ${battleEvent?.attack?.damage} damage ${battleEvent?.attack?.critical_hit ? "CRITICAL HIT!" : ""
      }`;
  } else if (finalBattleEvent?.type === "ambush") {
    battleMessage = `${BEAST_NAMES[beast?.id!]} ambushed your ${battleEvent?.attack?.location
      } for ${battleEvent?.attack?.damage} damage ${battleEvent?.attack?.critical_hit ? "CRITICAL HIT!" : ""
      }`;
  }

  const shareMessage =
    finalBattleEvent?.type === "obstacle"
      ? `I got a score of ${adventurer?.xp
      } in the Loot Survivor 2 dungeon. \n\n💀 ${OBSTACLE_NAMES[finalBattleEvent.obstacle?.id!]
      } ended my journey. \n\n@provablegames @lootsurvivor`
      : `I got a score of ${adventurer?.xp} in the Loot Survivor 2 dungeon. \n\n💀 A ${beast?.name} ended my journey. \n\n@provablegames @lootsurvivor`;

  const backToMenu = () => {
    if (quest) {
      navigate(`/survivor/campaign?chapter=${quest.chapterId}`, {
        replace: true,
      });
    } else {
      navigate("/survivor", { replace: true });
    }
  };

  useEffect(() => {
    if (gameId && adventurer) {
      playerDiedEvent({
        adventurerId: gameId,
        xp: adventurer.xp,
      });
    }
  }, [gameId, adventurer]);

  const GAME_TOKEN_ADDRESS = getContractByName(
    currentNetworkConfig.manifest,
    currentNetworkConfig.namespace,
    "game_token_systems"
  )?.address;

  let tokenResult = useGameTokenRanking({
    tokenId: gameId!,
    mintedByAddress: currentNetworkConfig.chainId === ChainId.WP_PG_SLOT ? GAME_TOKEN_ADDRESS : addAddressPadding(currentNetworkConfig.dungeon),
    settings_id: currentNetworkConfig.chainId === ChainId.WP_PG_SLOT ? 0 : undefined
  });

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={screenVariants}
      style={styles.container}
    >
      <Box sx={styles.content}>
        <Typography variant="h2" sx={styles.title}>
          Game Over
        </Typography>

        <Box sx={styles.statsContainer}>
          <Box sx={styles.statCard}>
            <Typography sx={styles.statLabel}>Final Score</Typography>
            <Typography sx={styles.statValue}>{tokenResult.ranking?.score || adventurer?.xp || 0}</Typography>
          </Box>

          <Box sx={styles.statCard}>
            <Typography sx={styles.statLabel}>Rank</Typography>
            <Typography sx={styles.statValue}>{tokenResult.ranking?.rank || 0}</Typography>
          </Box>
        </Box>

        {finalBattleEvent && (
          <Box sx={styles.battleCauseContainer}>
            <Typography sx={styles.battleCauseTitle}>
              Final Encounter
            </Typography>
            <Typography sx={styles.battleCauseText}>{battleMessage}</Typography>
          </Box>
        )}

        <Box sx={styles.messageContainer}>
          <Typography sx={styles.message}>
            {collectableCount > 0
              ? `You've proven your worth in Death Mountain by collecting ${collectableCount} ${collectableCount === 1 ? "beast" : "beasts"
              }. Your victories will echo through the halls of the great adventurers.`
              : `Though you fought valiantly in Death Mountain, the beasts proved too elusive this time. The mountain awaits your return, adventurer.`}
          </Typography>
        </Box>

        <Box sx={styles.buttonContainer}>
          <Button
            variant="outlined"
            component="a"
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(
              shareMessage
            )}`}
            target="_blank"
            sx={styles.shareButton}
          >
            Share on X
          </Button>
          <Button
            variant="contained"
            onClick={backToMenu}
            sx={styles.restartButton}
          >
            Play Again
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
}

const styles = {
  container: {
    width: "100%",
    height: "100dvh",
    display: "flex",
    flexDirection: "column" as const,
    background: "rgba(17, 17, 17, 0.95)",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "40px 20px",
    maxWidth: "800px",
    margin: "0 auto",
  },
  title: {
    color: "#80FF00",
    fontWeight: "bold",
    textShadow: "0 0 10px rgba(128, 255, 0, 0.3)",
    textAlign: "center",
    fontSize: "2.5rem",
  },
  statsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 2,
    width: "100%",
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px",
    gap: 1,
    background: "rgba(128, 255, 0, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(128, 255, 0, 0.2)",
    minWidth: "40%",
  },
  statLabel: {
    color: "rgba(128, 255, 0, 0.7)",
    fontSize: "1.1rem",
    fontFamily: "VT323, monospace",
  },
  statValue: {
    color: "#80FF00",
    fontSize: "2rem",
    fontFamily: "VT323, monospace",
    fontWeight: "bold",
  },
  battleCauseContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    background: "rgba(255, 165, 0, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 165, 0, 0.2)",
    width: "100%",
  },
  battleCauseTitle: {
    color: "rgba(255, 165, 0, 0.7)",
    fontSize: "1.2rem",
    fontFamily: "VT323, monospace",
    marginBottom: "8px",
  },
  battleCauseText: {
    color: "#FFA500",
    fontSize: "1.1rem",
    fontFamily: "VT323, monospace",
    textAlign: "center",
  },
  messageContainer: {
    padding: "20px",
    background: "rgba(128, 255, 0, 0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(128, 255, 0, 0.1)",
    width: "100%",
  },
  message: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: "1.1rem",
    fontFamily: "VT323, monospace",
    textAlign: "center",
    lineHeight: 1.5,
  },
  buttonContainer: {
    display: "flex",
    gap: 2,
    width: "100%",
  },
  shareButton: {
    flex: 1,
    fontSize: "1.2rem",
    fontWeight: "bold",
    height: "42px",
    color: "#80FF00",
    borderColor: "rgba(128, 255, 0, 0.3)",
    "&:hover": {
      borderColor: "rgba(128, 255, 0, 0.5)",
      backgroundColor: "rgba(128, 255, 0, 0.1)",
    },
  },
  restartButton: {
    flex: 1,
    fontSize: "1.2rem",
    fontWeight: "bold",
    height: "42px",
    background: "rgba(128, 255, 0, 0.15)",
    color: "#80FF00",
    borderRadius: "6px",
    border: "1px solid rgba(128, 255, 0, 0.2)",
    "&:hover": {
      background: "rgba(128, 255, 0, 0.25)",
    },
  },
};
