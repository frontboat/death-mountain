use death_mountain::models::adventurer::item::Item;

#[derive(IntrospectPacked, Copy, Drop, Serde)]
#[dojo::model]
pub struct CollectableEntity {
    #[key]
    pub beast_id: u8,
    #[key]
    pub index: u64,
    pub seed: u64,
    pub level: u16,
    pub health: u16,
    pub prefix: u8,
    pub suffix: u8,
    pub killed_by: u64,
}

#[derive(IntrospectPacked, Copy, Drop, Serde)]
#[dojo::model]
pub struct BeastKillCount {
    #[key]
    pub beast_id: u8,
    pub count: u64,
}

#[derive(IntrospectPacked, Copy, Drop, Serde)]
#[dojo::model]
pub struct BeastStats {
    #[key]
    pub id: felt252,
    pub adventurers_killed: u64,
}

#[derive(IntrospectPacked, Copy, Drop, Serde)]
#[dojo::model]
pub struct AdventurerKilled {
    #[key]
    pub id: felt252,
    #[key]
    pub kill_index: u64,
    pub adventurer_id: u64,
}

#[derive(IntrospectPacked, Copy, Drop, Serde)]
#[dojo::model]
pub struct AdventurerStats {
    #[key]
    pub id: u64,
    pub items_dropped: u16,
}

#[derive(IntrospectPacked, Copy, Drop, Serde)]
#[dojo::model]
pub struct DroppedItem {
    #[key]
    pub adventurer_id: u64,
    #[key]
    pub index: u16,
    pub item: Item,
}
