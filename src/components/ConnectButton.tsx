import { useWallet, ConnectType, useConnectedWallet } from '@terra-money/wallet-provider';

export function ConnectButton() {
  const {
    connect,
    disconnect,
  } = useWallet();

  const connectedWallet = useConnectedWallet();

  return (
    <div>
      {!connectedWallet && (
        <button onClick={() => connect(ConnectType.EXTENSION)}>
          Connect
        </button>
      )}
      {connectedWallet && (
        <>
          <pre>
            Connected to {connectedWallet.terraAddress} on {connectedWallet.network.name} - {connectedWallet.network.chainID}
          </pre>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      )}
    </div>
  );
}
