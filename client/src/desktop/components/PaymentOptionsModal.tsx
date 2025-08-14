import ROUTER_ABI from '@/abi/router-abi.json';
import { generateSwapCalls, getSwapQuote } from '@/api/ekubo';
import { useController } from '@/contexts/controller';
import { useSystemCalls } from '@/dojo/useSystemCalls';
import { NETWORKS } from '@/utils/networkConfig';
import { formatAmount } from '@/utils/utils';
import CloseIcon from '@mui/icons-material/Close';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import TokenIcon from '@mui/icons-material/Token';
import { Box, Button, FormControl, IconButton, Link, MenuItem, Select, Typography } from '@mui/material';
import { useProvider } from '@starknet-react/core';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from 'starknet';

let DUNGEON_TICKET_ADDRESS = import.meta.env.VITE_PUBLIC_DUNGEON_TICKET;
interface PaymentOptionsModalProps {
  open: boolean;
  onClose: () => void;
}

interface TokenSelectionProps {
  userTokens: any[];
  selectedToken: string;
  tokenQuote: { amount: string; loading: boolean; error?: string };
  onTokenChange: (tokenSymbol: string) => void;
  styles: any;
  useDungeonTicket: () => void;
}

// Memoized token selection component
const TokenSelectionContent = memo(({
  userTokens,
  selectedToken,
  tokenQuote,
  onTokenChange,
  useDungeonTicket,
  styles
}: TokenSelectionProps) => (
  <Box sx={styles.paymentCard}>
    <Box sx={styles.cardHeader}>
      <Box sx={styles.iconContainer}>
        <TokenIcon sx={{ fontSize: 28, color: '#d0c98d' }} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={styles.paymentTitle}>Pay with Crypto</Typography>
        <Typography sx={styles.paymentSubtitle}>Select any token in your controller wallet</Typography>
      </Box>
    </Box>

    <Box sx={styles.sectionContainer} pb={2} mt={1}>
      <FormControl fullWidth sx={styles.selectControl}>
        <Select
          value={selectedToken}
          onChange={(e) => onTokenChange(e.target.value)}
          sx={styles.cyberpunkSelect}
          MenuProps={{
            PaperProps: {
              sx: {
                background: 'rgba(24, 40, 24, 0.95)',
                border: '1px solid rgba(208, 201, 141, 0.3)',
                backdropFilter: 'blur(8px)',
              }
            }
          }}
        >
          {userTokens.map((token: any) => (
            <MenuItem key={token.symbol} value={token.symbol} sx={styles.selectItem}>
              <Box sx={styles.tokenRow}>
                <Box sx={styles.tokenLeft}>
                  <Typography sx={styles.tokenName}>{token.symbol}</Typography>
                </Box>
                <Typography sx={styles.tokenBalance}>{token.balance}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>

    <Box sx={styles.costDisplay}>
      <Typography sx={styles.costText}>
        {tokenQuote.loading ? (
          'Loading quote...'
        ) : tokenQuote.error ? (
          `Error: ${tokenQuote.error}`
        ) : tokenQuote.amount ? (
          `Cost: ${tokenQuote.amount} ${selectedToken}`
        ) : (
          'Loading...'
        )}
      </Typography>
    </Box>

    <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, mb: 2 }}>
      <Button
        variant="contained"
        sx={styles.activateButton}
        onClick={useDungeonTicket}
        fullWidth
        disabled={tokenQuote.loading || !!tokenQuote.error}
      >
        <Typography sx={styles.buttonText}>Enter Dungeon</Typography>
      </Button>
    </Box>
  </Box>
));



export default function PaymentOptionsModal({
  open,
  onClose,
}: PaymentOptionsModalProps) {
  const { buyGame } = useSystemCalls();
  const { tokenBalances, goldenPassIds, playerName, openProfile } = useController();

  // Use the provider from StarknetConfig
  const { provider } = useProvider();

  const routerContract = useMemo(() => new Contract(
    ROUTER_ABI,
    NETWORKS[import.meta.env.VITE_PUBLIC_CHAIN as keyof typeof NETWORKS].ekuboRouter,
    provider
  ), [provider]);

  // Get payment tokens from network config
  const paymentTokens = useMemo(() => {
    const network = NETWORKS[import.meta.env.VITE_PUBLIC_CHAIN as keyof typeof NETWORKS];
    return (network as any)?.paymentTokens || [];
  }, []);

  // Create user tokens list with balances and icons
  const userTokens = useMemo(() => {
    return paymentTokens.map((token: any) => ({
      symbol: token.name,
      balance: tokenBalances[token.name] || 0,
      address: token.address,
      decimals: token.decimals || 18,
      displayDecimals: token.displayDecimals || 4
    })).filter((token: any) => Number(token.balance) > 0 && token.address !== DUNGEON_TICKET_ADDRESS);
  }, [paymentTokens, tokenBalances]);

  const [selectedToken, setSelectedToken] = useState('');
  const [currentView, setCurrentView] = useState<'golden' | 'token' | 'credit' | null>(null);
  const [tokenQuote, setTokenQuote] = useState<{ amount: string; loading: boolean; error?: string }>({
    amount: '',
    loading: false
  });

  useEffect(() => {
    if (userTokens.length > 0 && !selectedToken) {
      setSelectedToken(userTokens[0].symbol);
    }
  }, [userTokens]);

  const fetchTokenQuote = useCallback(async (tokenSymbol: string) => {
    const selectedTokenData = userTokens.find((t: any) => t.symbol === tokenSymbol);

    if (!selectedTokenData?.address || !DUNGEON_TICKET_ADDRESS) {
      setTokenQuote({ amount: '', loading: false, error: 'Token not supported' });
      return;
    }

    setTokenQuote({ amount: '', loading: true });

    try {
      const quote = await getSwapQuote(-1e18, DUNGEON_TICKET_ADDRESS, selectedTokenData.address);
      if (quote) {
        const rawAmount = (quote.total * -1 / Math.pow(10, selectedTokenData.decimals || 18));
        const amount = formatAmount(rawAmount);
        setTokenQuote({ amount, loading: false });
      } else {
        setTokenQuote({ amount: '', loading: false, error: 'No quote available' });
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      setTokenQuote({ amount: '', loading: false, error: 'Failed to get quote' });
    }
  }, [userTokens]);

  const useGoldenToken = () => {
    buyGame({
      paymentType: 'Golden Pass',
      goldenPass: {
        address: NETWORKS[import.meta.env.VITE_PUBLIC_CHAIN as keyof typeof NETWORKS].goldenToken,
        tokenId: goldenPassIds[0]
      }
    }, playerName, []);
  };

  const useDungeonTicket = async () => {
    const selectedTokenData = userTokens.find((t: any) => t.symbol === selectedToken);
    const quote = await getSwapQuote(-1e18, DUNGEON_TICKET_ADDRESS, selectedTokenData.address);

    let tokenSwapData = {
      tokenAddress: DUNGEON_TICKET_ADDRESS,
      minimumAmount: 1,
      quote: quote
    }
    const calls = generateSwapCalls(routerContract, selectedTokenData.address, tokenSwapData);


    buyGame({
      paymentType: 'Ticket',
    }, playerName, calls);
  };

  // Handle token selection change
  const handleTokenChange = useCallback((tokenSymbol: string) => {
    setSelectedToken(tokenSymbol);
    fetchTokenQuote(tokenSymbol);
  }, [fetchTokenQuote]);

  // Reusable motion wrapper component - only animates on view changes, not token changes
  const MotionWrapper = ({ children, viewKey }: { children: React.ReactNode; viewKey: string }) => (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );

  // Reusable action button component
  const ActionButton = ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, mb: 2 }}>
      <Button
        variant="contained"
        sx={styles.activateButton}
        onClick={onClick}
        fullWidth
        disabled={disabled}
      >
        <Typography sx={styles.buttonText}>{children}</Typography>
      </Button>
    </Box>
  );


  // Initialize the view based on user's situation
  useEffect(() => {
    if (currentView === null) {
      if (goldenPassIds.length > 0) {
        setCurrentView('golden');
      } else if (userTokens && userTokens.length > 0 && userTokens.some((t: any) => parseFloat(t.balance) > 0)) {
        setCurrentView('token');
      } else {
        setCurrentView('credit');
      }
    }
  }, [currentView]);

  // Fetch initial quote when component loads or selected token changes
  useEffect(() => {
    if (selectedToken && currentView === 'token') {
      fetchTokenQuote(selectedToken);
    }
  }, [selectedToken, currentView]);

  return (
    <AnimatePresence>
      {open && (
        <Box sx={styles.overlay}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Box sx={styles.modal}>
              <Box sx={styles.modalGlow} />
              <IconButton onClick={onClose} sx={styles.closeBtn} size="small">
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>

              <Box sx={styles.header}>
                <Box sx={styles.titleContainer}>
                  <Typography sx={styles.title}>
                    DUNGEON ACCESS
                  </Typography>
                  <Box sx={styles.titleUnderline} />
                </Box>
                <Typography sx={styles.subtitle}>
                  Select payment method
                </Typography>
              </Box>

              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                width: '100%',
                maxWidth: '330px',
                mx: 'auto',
              }}>
                <AnimatePresence mode="wait">
                  {/* Golden Token Option */}
                  {currentView === 'golden' && (
                    <MotionWrapper viewKey="golden">
                      <Box sx={styles.paymentCard}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0, mt: 2 }}>
                          <Typography sx={styles.paymentTitle}>Use Golden Token</Typography>
                        </Box>

                        <Box sx={styles.goldenTokenContainer}>
                          <img
                            src={'/images/golden_token.svg'}
                            alt="Golden Token"
                            style={{
                              width: '150px',
                              height: '150px',
                            }}
                          />
                        </Box>

                        <ActionButton onClick={useGoldenToken}>
                          Enter Dungeon
                        </ActionButton>
                      </Box>
                    </MotionWrapper>
                  )}

                  {/* Token Payment Option */}
                  {currentView === 'token' && (
                    <motion.div
                      key="token-view"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ width: '100%' }}
                    >
                      <TokenSelectionContent
                        userTokens={userTokens}
                        selectedToken={selectedToken}
                        tokenQuote={tokenQuote}
                        onTokenChange={handleTokenChange}
                        styles={styles}
                        useDungeonTicket={useDungeonTicket}
                      />
                    </motion.div>
                  )}

                  {/* Credit Card Option */}
                  {currentView === 'credit' && (
                    <MotionWrapper viewKey="credit">
                      <Box sx={styles.paymentCard}>
                        <Box sx={[styles.cardHeader, { py: 1, pt: 2 }]}>
                          <Box sx={styles.iconContainer}>
                            <SportsEsportsOutlinedIcon sx={{ fontSize: 28, color: '#d0c98d' }} />
                          </Box>
                          <Box>
                            <Typography sx={styles.paymentTitle}>Cartridge</Typography>
                            <Typography sx={styles.paymentSubtitle}>Purchase system</Typography>
                          </Box>
                        </Box>

                        <Box sx={styles.sectionContainer} pb={1}>
                          <Box sx={styles.paymentOption} mb={0.5}>
                            <Box sx={styles.optionHeader} mb={0.5}>
                              <CreditCardIcon sx={{ fontSize: 18, color: '#d0c98d', mr: 1 }} />
                              <Typography sx={styles.optionTitle}>Credit Card</Typography>
                            </Box>
                            <Typography sx={styles.optionDescription}>Traditional payment method</Typography>
                          </Box>
                          <Box sx={styles.paymentOption}>
                            <Box sx={styles.optionHeader} mb={0.5}>
                              <TokenIcon sx={{ fontSize: 18, color: '#d0c98d', mr: 1 }} />
                              <Typography sx={styles.optionTitle}>Crypto</Typography>
                            </Box>
                            <Typography sx={styles.optionDescription}>multiple blockchain networks</Typography>
                          </Box>
                        </Box>

                        <ActionButton onClick={openProfile}>
                          Continue
                        </ActionButton>
                      </Box>
                    </MotionWrapper>
                  )}
                </AnimatePresence>
              </Box>

              {/* Footer links */}
              <Box sx={styles.footer}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {(currentView === 'golden' || currentView === 'credit') && (
                    <Link
                      component="button"
                      onClick={() => setCurrentView('token')}
                      sx={styles.footerLink}
                    >
                      Pay with crypto in your wallet
                    </Link>
                  )}
                  {currentView === 'token' && (
                    <Link
                      component="button"
                      onClick={() => setCurrentView('credit')}
                      sx={styles.footerLink}
                    >
                      Pay with credit card or other wallet
                    </Link>
                  )}
                </Box>
              </Box>
            </Box>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    bgcolor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  modal: {
    minWidth: 420,
    maxWidth: 460,
    p: 0,
    borderRadius: 3,
    background: 'linear-gradient(145deg, #1a2f1a 0%, #0f1f0f 100%)',
    border: '2px solid rgba(208, 201, 141, 0.4)',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(208, 201, 141, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  modalGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, transparent 30%, rgba(208, 201, 141, 0.02) 50%, transparent 70%)',
    pointerEvents: 'none',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    color: '#d0c98d',
    background: 'rgba(208, 201, 141, 0.1)',
    border: '1px solid rgba(208, 201, 141, 0.2)',
    '&:hover': {
      background: 'rgba(208, 201, 141, 0.2)',
      transform: 'scale(1.1)',
    },
    transition: 'all 0.2s ease',
    zIndex: 10,
  },
  header: {
    textAlign: 'center',
    p: 3,
    pb: 2,
    borderBottom: '1px solid rgba(208, 201, 141, 0.2)',
  },
  titleContainer: {
    position: 'relative',
    mb: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: '#d0c98d',
    textShadow: '0 2px 8px rgba(208, 201, 141, 0.3)',
    fontFamily: 'Cinzel, Georgia, serif',
  },
  titleUnderline: {
    width: 80,
    height: 2,
    background: 'linear-gradient(90deg, transparent, #d0c98d, transparent)',
    mx: 'auto',
    borderRadius: 1,
    mt: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFD700',
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  paymentCard: {
    height: '250px',
    m: 2,
    background: 'rgba(24, 40, 24, 0.6)',
    border: '2px solid rgba(208, 201, 141, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    backdropFilter: 'blur(4px)',
    '&:hover': {
      borderColor: 'rgba(208, 201, 141, 0.5)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    },
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    p: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: '8px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(208, 201, 141, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#d0c98d',
    letterSpacing: 0.5,
    mb: 0.5,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: '#FFD700',
    opacity: 0.7,
    letterSpacing: 0.5,
    lineHeight: 1.2,
  },
  selectControl: {
    '& .MuiOutlinedInput-root': {
      background: 'rgba(0, 0, 0, 0.3)',
    },
  },
  cyberpunkSelect: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(208, 201, 141, 0.3)',
    borderRadius: 1,
    color: '#d0c98d',
    '& .MuiSelect-select': {
      py: 1.5,
      fontSize: 14,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none',
    },
    '&:hover': {
      borderColor: 'rgba(208, 201, 141, 0.5)',
    },
    '&.Mui-focused': {
      borderColor: '#d0c98d',
      boxShadow: '0 0 10px rgba(208, 201, 141, 0.2)',
    },
  },
  selectItem: {
    background: 'rgba(24, 40, 24, 0.8)',
    color: '#d0c98d',
    '&:hover': {
      background: 'rgba(208, 201, 141, 0.1)',
    },
    '&.Mui-selected': {
      background: 'rgba(208, 201, 141, 0.2)',
    },
  },
  tokenRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tokenLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
  tokenIcon: {
    fontSize: 18,
  },
  tokenName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#d0c98d',
  },
  tokenBalance: {
    fontSize: 11,
    color: '#FFD700',
    opacity: 0.7,
  },
  sectionContainer: {
    px: 2
  },
  costDisplay: {
    px: 3,
    mb: 1,
    mt: 1,
    textAlign: 'center',
  },
  costText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#d0c98d',
    letterSpacing: 0.5,
  },
  paymentOption: {
    py: 1,
    px: 1.5,
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 1,
    border: '1px solid rgba(208, 201, 141, 0.1)',
  },
  optionHeader: {
    display: 'flex',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#d0c98d',
    letterSpacing: 0.3,
  },
  optionDescription: {
    fontSize: 12,
    color: '#FFD700',
    opacity: 0.7,
    letterSpacing: 0.5,
    lineHeight: 1.2,
  },
  goldenTokenContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateButton: {
    background: '#d0c98d',
    color: '#1a2f1a',
    py: 1.2,
    borderRadius: 1,
    fontWeight: 700,
    letterSpacing: 0.5,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    '&:hover': {
      background: '#e6df9a',
      boxShadow: '0 4px 12px rgba(208, 201, 141, 0.3)',
    },
    '&:active': {
      transform: 'translateY(1px)',
    },
    transition: 'all 0.2s ease',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: '#1a2f1a',
    textAlign: 'center',
  },
  footer: {
    p: 2,
    textAlign: 'center',
    borderTop: '1px solid rgba(208, 201, 141, 0.2)',
  },
  footerLink: {
    fontSize: 13,
    color: '#FFD700',
    textDecoration: 'underline',
    letterSpacing: 0.5,
    transition: 'color 0.2s',
    '&:hover': {
      color: '#d0c98d',
      textDecoration: 'underline',
    },
  },
};