// SPDX-License-Identifier: BUSL-1.1

use death_mountain::constants::combat::CombatEnums::Type;
use death_mountain::models::beast::Beast;
use death_mountain::models::game_data::{AdventurerKilled, CollectableEntity, CollectableResult, EntityStats};
use starknet::ContractAddress;

#[starknet::interface]
pub trait IBeastSystems<T> {
    fn add_collectable(
        ref self: T, seed: u64, entity_id: u8, level: u16, health: u16, prefix: u8, suffix: u8, adventurer_id: u64,
    );
    fn add_kill(ref self: T, entity_hash: felt252, adventurer_id: u64);
    fn get_valid_collectable(
        self: @T, adventurer_id: u64, entity_hash: felt252,
    ) -> CollectableResult<(u16, u16)>;
    fn get_collectable(self: @T, dungeon: ContractAddress, entity_hash: felt252, index: u64) -> CollectableEntity;
    fn get_collectable_count(self: @T, dungeon: ContractAddress, entity_hash: felt252) -> u64;
    fn get_entity_stats(self: @T, dungeon: ContractAddress, entity_hash: felt252) -> EntityStats;
    fn get_adventurer_killed(
        self: @T, dungeon: ContractAddress, entity_hash: felt252, kill_index: u64,
    ) -> AdventurerKilled;
    fn get_starter_beast(self: @T, starter_weapon_type: Type) -> Beast;
    fn get_beast(
        self: @T,
        adventurer_level: u8,
        weapon_type: Type,
        seed: u32,
        health_rnd: u16,
        level_rnd: u16,
        special2_rnd: u8,
        special3_rnd: u8,
    ) -> Beast;
    fn get_critical_hit_chance(self: @T, adventurer_level: u8, is_ambush: bool) -> u8;
    fn attempt_flee(self: @T, adventurer_level: u8, adventurer_dexterity: u8, rnd: u8) -> bool;
}

#[dojo::contract]
mod beast_systems {
    use death_mountain::constants::combat::CombatEnums::Type;
    use death_mountain::constants::world::DEFAULT_NS;
    use death_mountain::models::beast::{Beast, ImplBeast};
    use death_mountain::models::game_data::{
        AdventurerKilled, CollectableCount, CollectableEntity, CollectableResult, EntityStats,
    };
    use dojo::model::ModelStorage;
    use dojo::world::WorldStorage;
    use starknet::ContractAddress;
    use tournaments::components::models::game::TokenMetadata;
    use super::IBeastSystems;

    #[abi(embed_v0)]
    impl BeastSystemsImpl of IBeastSystems<ContractState> {
        fn add_collectable(
            ref self: ContractState,
            seed: u64,
            entity_id: u8,
            level: u16,
            health: u16,
            prefix: u8,
            suffix: u8,
            adventurer_id: u64,
        ) {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            let token_metadata: TokenMetadata = world.read_model(adventurer_id);
            let mut collectable_count: CollectableCount = world.read_model((token_metadata.minted_by, entity_id));

            world
                .write_model(
                    @CollectableEntity {
                        dungeon: token_metadata.minted_by,
                        entity_hash: ImplBeast::get_beast_hash(entity_id, prefix, suffix),
                        seed,
                        index: collectable_count.count,
                        level,
                        health,
                        prefix,
                        suffix,
                        killed_by: adventurer_id,
                    },
                );

            collectable_count.count += 1;
            world.write_model(@collectable_count);
        }

        fn add_kill(ref self: ContractState, entity_hash: felt252, adventurer_id: u64) {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            let token_metadata: TokenMetadata = world.read_model(adventurer_id);
            let mut entity_stats: EntityStats = world.read_model((token_metadata.minted_by, entity_hash));

            entity_stats.adventurers_killed += 1;
            world.write_model(@entity_stats);
            world
                .write_model(
                    @AdventurerKilled {
                        dungeon: token_metadata.minted_by,
                        entity_hash,
                        kill_index: entity_stats.adventurers_killed,
                        adventurer_id,
                    },
                );
        }

        fn get_valid_collectable(
            self: @ContractState, adventurer_id: u64, entity_hash: felt252,
        ) -> CollectableResult<(u16, u16)> {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            let collectable_entity: CollectableEntity = world
                .read_model((starknet::get_caller_address(), entity_hash, 0));

            if collectable_entity.killed_by == adventurer_id {
                CollectableResult::Ok((collectable_entity.level, collectable_entity.health))
            } else {
                CollectableResult::Err('Not Valid'.into())
            }
        }

        fn get_collectable(
            self: @ContractState, dungeon: ContractAddress, entity_hash: felt252, index: u64,
        ) -> CollectableEntity {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            world.read_model((dungeon, entity_hash, index))
        }

        fn get_collectable_count(self: @ContractState, dungeon: ContractAddress, entity_hash: felt252) -> u64 {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            let collectable_count: CollectableCount = world.read_model((dungeon, entity_hash));
            collectable_count.count
        }

        fn get_entity_stats(self: @ContractState, dungeon: ContractAddress, entity_hash: felt252) -> EntityStats {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            world.read_model((dungeon, entity_hash))
        }

        fn get_adventurer_killed(
            self: @ContractState, dungeon: ContractAddress, entity_hash: felt252, kill_index: u64,
        ) -> AdventurerKilled {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            world.read_model((dungeon, entity_hash, kill_index))
        }

        fn get_starter_beast(self: @ContractState, starter_weapon_type: Type) -> Beast {
            ImplBeast::get_starter_beast(starter_weapon_type)
        }

        fn get_beast(
            self: @ContractState,
            adventurer_level: u8,
            weapon_type: Type,
            seed: u32,
            health_rnd: u16,
            level_rnd: u16,
            special2_rnd: u8,
            special3_rnd: u8,
        ) -> Beast {
            ImplBeast::get_beast(adventurer_level, weapon_type, seed, health_rnd, level_rnd, special2_rnd, special3_rnd)
        }

        fn get_critical_hit_chance(self: @ContractState, adventurer_level: u8, is_ambush: bool) -> u8 {
            ImplBeast::get_critical_hit_chance(adventurer_level, is_ambush)
        }

        fn attempt_flee(self: @ContractState, adventurer_level: u8, adventurer_dexterity: u8, rnd: u8) -> bool {
            ImplBeast::attempt_flee(adventurer_level, adventurer_dexterity, rnd)
        }
    }
}
