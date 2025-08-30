import { useState, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  Collapse,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  Card,
  CardContent,
  Alert,
  Grid
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess, 
  Upload, 
  Timeline,
  Favorite,
  Shield,
  SportsMma, // Using SportsMma instead of Swords
  TrendingUp,
  Warning,
  EmojiEvents,
  AttachMoney
} from '@mui/icons-material';
import { GameLogEntry } from '@/types/gameLog';

export default function LogViewerPage() {
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);

  // Load log file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setLogs(data);
        setSelectedLogIndex(0);
      } catch (error) {
        alert('Invalid log file format');
      }
    };
    reader.readAsText(file);
  };

  // Filter logs based on type and search
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesType = filterType === 'all' || log.eventType === filterType;
      const matchesSearch = !searchText || 
        JSON.stringify(log).toLowerCase().includes(searchText.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [logs, filterType, searchText]);

  // Get unique event types for filter
  const eventTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.eventType));
    return Array.from(types).sort();
  }, [logs]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    
    const lastLog = logs[logs.length - 1];
    const duration = logs.length > 0 ? 
      (logs[logs.length - 1].timestamp - logs[0].timestamp) / 1000 / 60 : 0;
    
    return {
      totalEvents: logs.length,
      duration: duration.toFixed(1),
      finalLevel: lastLog.gameState.level,
      finalGold: lastLog.gameState.gold,
      finalXP: lastLog.gameState.xp,
      beastsDefeated: logs.filter(l => l.eventType === 'defeated_beast').length,
      obstaclesEncountered: logs.filter(l => l.eventType === 'obstacle').length,
      itemsPurchased: logs.filter(l => l.eventType === 'buy_items').length,
      deaths: logs.filter(l => l.event.adventurer?.health === 0).length > 0
    };
  }, [logs]);

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'beast': return <SportsMma fontSize="small" />;
      case 'defeated_beast': return <EmojiEvents fontSize="small" />;
      case 'obstacle': return <Warning fontSize="small" />;
      case 'discovery': return <AttachMoney fontSize="small" />;
      case 'level_up': return <TrendingUp fontSize="small" />;
      case 'adventurer': return <Shield fontSize="small" />;
      default: return null;
    }
  };

  const getEventColor = (type: string) => {
    switch(type) {
      case 'beast': return 'error';
      case 'defeated_beast': return 'success';
      case 'obstacle': return 'warning';
      case 'discovery': return 'info';
      case 'level_up': return 'primary';
      default: return 'default';
    }
  };

  const selectedLog = selectedLogIndex !== null ? filteredLogs[selectedLogIndex] : null;

  return (
    <Box sx={{ p: 3, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            component="label"
            startIcon={<Upload />}
            sx={{
              backgroundColor: 'primary.dark',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              }
            }}
          >
            Load Log File
            <input
              type="file"
              hidden
              accept=".json"
              onChange={handleFileUpload}
            />
          </Button>
          
          {logs.length > 0 && (
            <>
              <Typography variant="body2">
                Game #{logs[0]?.gameState.gameId} • {logs.length} events
              </Typography>
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={filterType}
                  label="Event Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Events</MenuItem>
                  {eventTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                size="small"
                label="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{ minWidth: 200 }}
              />
            </>
          )}
        </Stack>
      </Paper>

      {logs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" sx={{ color: 'text.primary', opacity: 0.8 }}>
            Load a game log file to begin analysis
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
          {/* Left Panel - Event List */}
          <Paper sx={{ flex: '0 0 400px', overflow: 'auto', p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Events Timeline
            </Typography>
            
            {/* Stats Summary */}
            {stats && (
              <Card sx={{ mb: 2, bgcolor: 'background.default' }}>
                <CardContent>
                  <Grid container spacing={1}>
                    <Grid size={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Duration</Typography>
                      <Typography variant="body1">{stats.duration} min</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Final Level</Typography>
                      <Typography variant="body1">{stats.finalLevel}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Beasts Defeated</Typography>
                      <Typography variant="body1">{stats.beastsDefeated}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Final Gold</Typography>
                      <Typography variant="body1">{stats.finalGold}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
            
            <Stack spacing={1}>
              {filteredLogs.map((log, index) => (
                <Card 
                  key={index}
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: selectedLogIndex === index ? 'action.selected' : 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => setSelectedLogIndex(index)}
                >
                  <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {getEventIcon(log.eventType)}
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {log.eventType}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.primary', opacity: 0.8 }}>
                          Action #{log.actionCount} • {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Chip 
                          label={`HP: ${log.gameState.health}`} 
                          size="small"
                          color={log.gameState.health < 30 ? 'error' : 'default'}
                        />
                        <Chip 
                          label={`L${log.gameState.level}`} 
                          size="small"
                          color="primary"
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>

          {/* Right Panel - Event Details */}
          {selectedLog && (
            <Paper sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Tabs 
                value={selectedTab} 
                onChange={(_, v) => setSelectedTab(v)} 
                sx={{ 
                  mb: 2,
                  '& .MuiTab-root': {
                    color: 'text.primary',
                    opacity: 0.7,
                    '&.Mui-selected': {
                      color: 'primary.main',
                      opacity: 1
                    }
                  }
                }}
              >
                <Tab label="Event Details" />
                <Tab label="Game State" />
                <Tab label="Predictions" />
                <Tab label="Raw JSON" />
              </Tabs>

              {selectedTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedLog.eventType} Event
                  </Typography>
                  
                  {/* Event-specific rendering */}
                  {selectedLog.event.beast && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Beast Encounter</Typography>
                        <Grid container spacing={2}>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Name</Typography>
                            <Typography variant="body1">{selectedLog.event.beast.name}</Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Level</Typography>
                            <Typography variant="body1">{selectedLog.event.beast.level}</Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Health</Typography>
                            <Typography variant="body1">{selectedLog.event.beast.health}</Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Type</Typography>
                            <Typography variant="body1">{selectedLog.event.beast.type}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedLog.event.obstacle && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Obstacle</Typography>
                        <Grid container spacing={2}>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Name</Typography>
                            <Typography variant="body1">{selectedLog.event.obstacle.name}</Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Damage</Typography>
                            <Typography variant="body1">{selectedLog.event.obstacle.damage}</Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Location</Typography>
                            <Typography variant="body1">{selectedLog.event.obstacle.location}</Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Dodged</Typography>
                            <Typography variant="body1">{selectedLog.event.obstacle.dodged ? 'Yes' : 'No'}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedLog.event.items_purchased && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Items Purchased</Typography>
                        {selectedLog.event.items_purchased.map((purchase, i) => (
                          <Box key={i}>
                            <Typography variant="body2">
                              {purchase.item.name} (T{purchase.item.tier})
                            </Typography>
                          </Box>
                        ))}
                        {selectedLog.event.potions && (
                          <Typography variant="body2">
                            {selectedLog.event.potions} Potions
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </Box>
              )}

              {selectedTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Game State at Action #{selectedLog.actionCount}
                  </Typography>
                  
                  {/* Adventurer Stats */}
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>Adventurer</Typography>
                      <Grid container spacing={2}>
                        <Grid size={3}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Health</Typography>
                          <Typography variant="h6">{selectedLog.gameState.health}</Typography>
                        </Grid>
                        <Grid size={3}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Gold</Typography>
                          <Typography variant="h6">{selectedLog.gameState.gold}</Typography>
                        </Grid>
                        <Grid size={3}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>XP</Typography>
                          <Typography variant="h6">{selectedLog.gameState.xp}</Typography>
                        </Grid>
                        <Grid size={3}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Level</Typography>
                          <Typography variant="h6">{selectedLog.gameState.level}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                  
                  {/* Equipment */}
                  {selectedLog.gameState.adventurer && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Equipment</Typography>
                        <Stack spacing={1}>
                          {Object.entries(selectedLog.gameState.adventurer.equipment).map(([slot, item]) => (
                            <Box key={slot}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {slot.charAt(0).toUpperCase() + slot.slice(1)}
                              </Typography>
                              <Typography variant="body2" color="text.primary">
                                {item && typeof item === 'object' && 'name' in item ? 
                                  `${item.name} (T${item.tier})` : 
                                  'Empty'}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Inventory */}
                  {selectedLog.gameState.bag.length > 0 && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Inventory</Typography>
                        <Stack spacing={0.5}>
                          {selectedLog.gameState.bag.map((item, i) => (
                            <Typography key={i} variant="body2">
                              {item.name} ({item.slot}, T{item.tier})
                            </Typography>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              )}

              {selectedTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Predictions & Calculations
                  </Typography>
                  
                  {/* Combat Predictions */}
                  {selectedLog.predictions.combat && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Combat Predictions</Typography>
                        
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Equipped Weapon</Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedLog.predictions.combat.equippedWeapon.item.name} - 
                          Damage: {selectedLog.predictions.combat.equippedWeapon.baseDamage} / 
                          Crit: {selectedLog.predictions.combat.equippedWeapon.criticalDamage}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>
                          Beast Damage by Slot
                        </Typography>
                        <Stack spacing={0.5}>
                          {selectedLog.predictions.combat.equippedArmor.map((armor, i) => (
                            <Typography key={i} variant="body2">
                              {armor.slot}: {armor.beastDamage} damage
                              {armor.item && ` (protected by ${armor.item.name})`}
                            </Typography>
                          ))}
                        </Stack>
                        
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Flee Chance: {selectedLog.predictions.combat.fleeChance}%
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Obstacle Predictions */}
                  {selectedLog.predictions.obstacles && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Obstacle Predictions</Typography>
                        <Typography variant="body2">
                          Dodge Chance: {selectedLog.predictions.obstacles.dodgeChance}%
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Future Encounters */}
                  {selectedLog.predictions.futureEncounters && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Next Encounters</Typography>
                        <Stack spacing={0.5}>
                          {selectedLog.predictions.futureEncounters.slice(0, 3).map((enc, i) => (
                            <Typography key={i} variant="body2">
                              {i + 1}. {enc.encounter}: {enc.name || `ID ${enc.id}`} 
                              {enc.level && ` (Level ${enc.level})`}
                            </Typography>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              )}

              {selectedTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Raw JSON
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'background.default', overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '12px' }}>
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}