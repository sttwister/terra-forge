import { getChainOptions, WalletProvider } from '@terra-money/wallet-provider';
import { ConnectButton } from 'components/ConnectButton';
import { AnchorStrategy } from 'components/AnchorStrategy';
import ReactDOM from 'react-dom';
import './style.css';

function App() {
  return (
    <main
      style={{ margin: 20, display: 'flex', flexDirection: 'column', gap: 40 }}
    >
      <ConnectButton />
      <AnchorStrategy />
    </main>
  );
}

getChainOptions().then((chainOptions) => {
  ReactDOM.render(
    <WalletProvider {...chainOptions}>
      <App />
    </WalletProvider>,
    document.getElementById('root'),
  );
});
