// SPDX-License-Identifier: MIT

use game_components_minigame::structs::GameDetail;

#[starknet::interface]
pub trait IRendererSystems<T> {
    fn create_metadata(self: @T, adventurer_id: u64) -> ByteArray;
    fn generate_svg(self: @T, adventurer_id: u64) -> ByteArray;
    fn generate_details(self: @T, adventurer_id: u64) -> Span<GameDetail>;
}

#[dojo::contract]
mod renderer_systems {
    use death_mountain::constants::world::{DEFAULT_NS};
    use death_mountain::libs::game::ImplGameLibs;
    use death_mountain::models::adventurer::adventurer::Adventurer;
    use death_mountain::models::adventurer::bag::Bag;
    use death_mountain::systems::adventurer::contracts::{IAdventurerSystemsDispatcherTrait};
    use death_mountain::utils::renderer::renderer_utils::{create_metadata, generate_details, generate_svg};
    use dojo::world::{WorldStorageTrait};
    use game_components_minigame::interface::{
        IMinigameDetails, IMinigameDetailsSVG, IMinigameDispatcher, IMinigameDispatcherTrait,
    };
    use game_components_minigame::libs::require_owned_token;

    use game_components_minigame::structs::GameDetail;
    use super::IRendererSystems;

    #[abi(embed_v0)]
    impl GameDetailsImpl of IMinigameDetails<ContractState> {
        fn token_description(self: @ContractState, token_id: u64) -> ByteArray {
            let mut world = self.world(@DEFAULT_NS());
            let (game_token_systems_address, _) = world.dns(@"game_token_systems").unwrap();
            let minigame_dispatcher = IMinigameDispatcher { contract_address: game_token_systems_address };
            let token_address = minigame_dispatcher.token_address();
            require_owned_token(token_address, token_id);
            format!("Test Token Description for token {}", token_id)
        }
        fn game_details(self: @ContractState, token_id: u64) -> Span<GameDetail> {
            let mut world = self.world(@DEFAULT_NS());
            let (game_token_systems_address, _) = world.dns(@"game_token_systems").unwrap();
            let minigame_dispatcher = IMinigameDispatcher { contract_address: game_token_systems_address };
            let token_address = minigame_dispatcher.token_address();
            require_owned_token(token_address, token_id);
            self.generate_details(token_id.try_into().unwrap())
        }
    }

    #[abi(embed_v0)]
    impl GameDetailsSVGImpl of IMinigameDetailsSVG<ContractState> {
        fn game_details_svg(self: @ContractState, token_id: u64) -> ByteArray {
            let mut world = self.world(@DEFAULT_NS());
            let (game_token_systems_address, _) = world.dns(@"game_token_systems").unwrap();
            let minigame_dispatcher = IMinigameDispatcher { contract_address: game_token_systems_address };
            let token_address = minigame_dispatcher.token_address();
            require_owned_token(token_address, token_id);
            self.generate_svg(token_id.try_into().unwrap())
        }
    }

    #[abi(embed_v0)]
    impl RendererSystemsImpl of IRendererSystems<ContractState> {
        fn create_metadata(self: @ContractState, adventurer_id: u64) -> ByteArray {
            let game_libs = ImplGameLibs::new(self.world(@DEFAULT_NS()));
            let (adventurer, bag): (Adventurer, Bag) = game_libs.adventurer.load_assets(adventurer_id);
            let adventurer_name = game_libs.adventurer.get_adventurer_name(adventurer_id);

            create_metadata(adventurer_id, adventurer, adventurer_name, bag)
        }

        fn generate_svg(self: @ContractState, adventurer_id: u64) -> ByteArray {
            let game_libs = ImplGameLibs::new(self.world(@DEFAULT_NS()));
            let (adventurer, bag): (Adventurer, Bag) = game_libs.adventurer.load_assets(adventurer_id);
            let adventurer_name = game_libs.adventurer.get_adventurer_name(adventurer_id);

            generate_svg(adventurer_id, adventurer, adventurer_name, bag)
        }

        fn generate_details(self: @ContractState, adventurer_id: u64) -> Span<GameDetail> {
            let game_libs = ImplGameLibs::new(self.world(@DEFAULT_NS()));
            let (adventurer, _): (Adventurer, Bag) = game_libs.adventurer.load_assets(adventurer_id);

            generate_details(adventurer)
        }
    }
}
