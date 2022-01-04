import { useConnectedWallet, useLCDClient } from '@terra-money/wallet-provider';

export const LiquidationBid = ({ bid }) => {
  const lcd = useLCDClient();

  const cancelBid = (idx) => {
    alert(idx);
  }

  return (
    <div>
      <h5>BID {bid.idx}</h5>
      <pre>
        {bid.premium_slot}% - {bid.amount.toFixed(2)}$ - {bid.liquidated.toFixed(2)} bLUNA
      {lcd && (
        <button onClick={() => cancelBid(bid.idx)}>
          Cancel
        </button>
      )}
      </pre>
    </div>
  )

}
