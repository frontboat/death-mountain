#[derive(IntrospectPacked, Copy, Drop, Serde)]
#[dojo::model]
pub struct CollectableBeast {
    #[key]
    pub beast_id: u8,
    #[key]
    pub index: u16,
    pub seed: u64,
    pub level: u16,
    pub health: u16,
    pub prefix: u8,
    pub suffix: u8,
    pub killed_by: u64, // adventurer id
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
pub struct BeastKill {
    #[key]
    pub id: felt252,
    #[key]
    pub kill_index: u64,
    pub adventurer_id: u64,
}
