import { useDojoConfig } from "@/contexts/starknet";
import { addAddressPadding } from "starknet";

import { useGameStore } from "@/stores/gameStore";
import { getShortNamespace } from "@/utils/utils";
import { gql, request } from "graphql-request";
import { GameTokenData } from "metagame-sdk";

export const useGameTokens = () => {
  const dojoConfig = useDojoConfig();

  const namespace = dojoConfig.namespace;
  const NS_SHORT = getShortNamespace(namespace);

  const fetchMetadata = async (gameTokens: any, tokenId: number) => {
    const gameToken = gameTokens?.find(
      (token: any) => token.token_id === tokenId
    );

    if (gameToken) {
      useGameStore.getState().setMetadata({
        player_name: gameToken.player_name,
        settings_id: gameToken.settings_id,
        minted_by: gameToken.minted_by_address,
        expires_at: parseInt(gameToken.lifecycle.end || 0, 16) * 1000,
        available_at: parseInt(gameToken.lifecycle.start || 0, 16) * 1000,
      });
      return;
    }
  };

  const fetchAdventurerData = async (gamesData: GameTokenData[]) => {
    const formattedTokenIds = gamesData.map(
      (game) => `"${addAddressPadding(game.token_id.toString(16))}"`
    );
    const document = gql`
      {
        ${NS_SHORT}GameEventModels (limit:10000, where:{
          adventurer_idIN:[${formattedTokenIds}]}
        ){
          edges {
            node {
              adventurer_id
              details {
                option
                adventurer {
                  health
                  xp
                  gold
                  equipment {
                    weapon {
                      id
                    }
                    chest {
                      id
                    }
                    head {
                      id
                    }
                    waist {
                      id
                    }
                    foot {
                      id
                    }
                    hand {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }`;

    try {
      const res: any = await request(
        dojoConfig.toriiUrl + "/graphql",
        document
      );
      let gameEvents =
        res?.[`${NS_SHORT}GameEventModels`]?.edges.map(
          (edge: any) => edge.node
        ) ?? [];

      let games = gamesData.map((game: any) => {
        let adventurerData = gameEvents.find(
          (event: any) =>
            parseInt(event.adventurer_id, 16) === game.token_id
        );

        let adventurer = adventurerData?.details?.adventurer || {};
        let tokenId = game.token_id;
        let expires_at = (game.lifecycle.end || 0) * 1000;
        let available_at = (game.lifecycle.start || 0) * 1000;

        return {
          ...adventurer,
          adventurer_id: tokenId,
          player_name: game.player_name,
          settings_id: game.settings_id,
          minted_by: game.minted_by,
          expires_at,
          available_at,
          expired: expires_at !== 0 && expires_at < Date.now(),
          dead: adventurer.xp !== 0 && adventurer.health === 0,
        };
      });

      return games;
    } catch (ex) {
      return [];
    }
  };

  return {
    fetchMetadata,
    fetchAdventurerData,
  };
};
