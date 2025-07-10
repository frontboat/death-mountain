use death_mountain::constants::combat::CombatEnums::Type;
use death_mountain::models::beast::Beast;

#[starknet::interface]
pub trait IBeastSystems<T> {
    fn add_collectable(ref self: T, beast_id: u8, level: u16, health: u16, prefix: u8, suffix: u8, adventurer_id: u64);
    fn add_kill(ref self: T, id: felt252, adventurer_id: u64);

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
    use death_mountain::constants::world::{DEFAULT_NS};
    use death_mountain::models::beast::{Beast, ImplBeast};
    use death_mountain::models::collectable::{BeastKill, BeastStats, CollectableBeast};
    use dojo::model::ModelStorage;
    use dojo::world::WorldStorage;
    use super::IBeastSystems;

    #[abi(embed_v0)]
    impl BeastSystemsImpl of IBeastSystems<ContractState> {
        fn add_collectable(
            ref self: ContractState, beast_id: u8, level: u16, health: u16, prefix: u8, suffix: u8, adventurer_id: u64,
        ) {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());

            let id = ImplBeast::get_beast_hash(beast_id, prefix, suffix);
            let mut collectable_beast: CollectableBeast = world.read_model(id);

            if collectable_beast.id == 0 {
                collectable_beast.id = id;
                collectable_beast.beast_id = beast_id;
                collectable_beast.level = level;
                collectable_beast.health = health;
                collectable_beast.prefix = prefix;
                collectable_beast.suffix = suffix;
                collectable_beast.collected = false;
                collectable_beast.killed_by = adventurer_id;
                world.write_model(@collectable_beast);
            }
        }

        fn add_kill(ref self: ContractState, id: felt252, adventurer_id: u64) {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            let mut beast_stats: BeastStats = world.read_model(id);
            beast_stats.adventurers_killed += 1;
            world.write_model(@beast_stats);
            world.write_model(@BeastKill { id, kill_index: beast_stats.adventurers_killed, adventurer_id });
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
