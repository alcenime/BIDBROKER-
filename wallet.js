/* BIDBROKER — wallet.js
 * Wallet connect via Reown AppKit (ethers adapter), Robinhood Chain mainnet (4663).
 * Pastikan domain situs sudah di-allowlist di cloud.reown.com untuk PROJECT_ID ini.
 * Dipakai di halaman yang punya tombol Connect Wallet (index, bid, token, leaderboard):
 * <script type="module" src="wallet.js"></script>
 * Tombol dikenali lewat class .js-wallet atau .mobile-wallet.
 */

const PROJECT_ID = '2ee5bb382849649365d9a79c10cbddb3';

import { createAppKit } from 'https://esm.sh/@reown/appkit';
import { EthersAdapter } from 'https://esm.sh/@reown/appkit-adapter-ethers';
import { defineChain } from 'https://esm.sh/@reown/appkit/networks';

const robinhood = defineChain({
  id: 4663,
  caipNetworkId: 'eip155:4663',
  chainNamespace: 'eip155',
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } }
});

const BTN_SELECTOR = '.js-wallet, .mobile-wallet';
const DEFAULT_LABEL = 'Connect Wallet';

let appkit = null;
try {
  if (!PROJECT_ID || PROJECT_ID.startsWith('YOUR_')) throw new Error('PROJECT_ID belum diisi di wallet.js');
  appkit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [robinhood],
    defaultNetwork: robinhood,
    projectId: PROJECT_ID,
    metadata: {
      name: 'BIDBROKER',
      description: 'BIDBROKER — NFT auctions and ETH mining on Robinhood Chain',
      url: window.location.origin,
      icons: []
    },
    features: { analytics: false, email: false, socials: false, onramp: false, swaps: false },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#C8FF00',
      '--w3m-color-mix': '#0C0D0B',
      '--w3m-color-mix-strength': 20,
      '--w3m-border-radius-master': '1px'
    }
  });
} catch (err) {
  console.error('[wallet.js]', err);
}

const short = (a) => a.slice(0, 6) + '…' + a.slice(-4);

function setLabel(text) {
  document.querySelectorAll(BTN_SELECTOR).forEach((b) => { b.textContent = text; });
}

// Provider EIP-1193 dari koneksi AppKit (injected maupun WalletConnect).
// Fallback ke window.ethereum.
function getProvider() {
  try {
    const p = appkit && appkit.getWalletProvider && appkit.getWalletProvider();
    if (p && typeof p.request === 'function') return p;
  } catch (e) { console.error('[wallet.js] getWalletProvider', e); }
  return window.ethereum || null;
}
window.bbWallet = { address: null, appkit, getProvider };

document.querySelectorAll(BTN_SELECTOR).forEach((b) => {
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (!appkit) { alert('Wallet belum dikonfigurasi (Project ID belum diisi).'); return; }
    // Belum konek -> modal pilih wallet. Sudah konek -> modal akun (ada Disconnect).
    appkit.open();
  });
});

// Hook halaman — leaderboard.html punya window.BBLeaderboard.setConnected(address).
function pushToPages(address) {
  try { if (window.BBLeaderboard && window.BBLeaderboard.setConnected) window.BBLeaderboard.setConnected(address); } catch (e) { console.error('[wallet.js] BBLeaderboard', e); }
}

if (appkit) {
  appkit.subscribeAccount((acc) => {
    const address = (acc && acc.isConnected && acc.address) ? acc.address : null;
    setLabel(address ? short(address) : DEFAULT_LABEL);
    window.bbWallet.address = address;
    pushToPages(address);
    document.dispatchEvent(new CustomEvent('bbwallet:change', { detail: { address } }));
  });
}
