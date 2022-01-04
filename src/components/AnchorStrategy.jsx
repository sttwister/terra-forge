import { useConnectedWallet, useLCDClient } from '@terra-money/wallet-provider';
import { useEffect, useState, useMemo } from 'react';

import { LiquidationBid } from 'components/LiquidationBid';


const overseer_contract = "terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8";
const oracle_contract = "terra1cgg6yef7qcdm070qftghfulaxmllgmvk77nc7t";
const market_contract = "terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s";
const liquidation_contract = "terra1e25zllgag7j9xsun3me4stnye2pcg66234je3u";
const bluna_contract = "terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp";


export function AnchorStrategy() {
  const lcd = useLCDClient();
  const connectedWallet = useConnectedWallet();

  const [collaterals, setCollaterals] = useState();
  const [prices, setPrices] = useState();
  const [borrowedAmount, setBorrowedValue] = useState();
  const [bids, setBids] = useState();

  /**
   * Anchor collateral
   */

  // Fetch collateral prices
  const updatePrices = async () => {
    if (connectedWallet && lcd) {
      // Get prices from oracle
      const response = await lcd.wasm.contractQuery(oracle_contract, {'prices': {}});

      // Transform response into a easy dictionary lookup
      // response = {prices: [{ asset: ..., price: ...}, { ... } ]}
      // prices = {asset: price, ...}
      const prices = response.prices.reduce((obj, item) => {
        obj[item.asset] = parseFloat(item.price);
        return obj;
      }, {});

      setPrices(prices);
    } else {
      setPrices(null);
    }
  }

  // Fetch collateral amounts
  const updateCollaterals = async () => {
    if (connectedWallet && lcd) {
      // Fetch collaterals for current address
      const query = {
        collaterals: {
          borrower: connectedWallet.walletAddress
        }
      };

      const response = await lcd.wasm.contractQuery(overseer_contract, query);

      // Transform response to {asset: value, ...} format
      let collaterals = {};
      collaterals = response.collaterals.reduce((obj, item) => {
        obj[item[0]] = parseInt(item[1]) / 10 ** 6;
        return obj;
      }, collaterals);

      setCollaterals(collaterals);
    } else {
      setCollaterals(null);
    }
  }

  // Fetch borrowed amount
  const updateBorrowedValue = async () => {
    if (connectedWallet && lcd) {
      const query = {
        'borrower_info': {
          'borrower': connectedWallet.walletAddress
        }
      }
      const response = await lcd.wasm.contractQuery(market_contract, query);
      setBorrowedValue(parseInt(response.loan_amount) / 10 ** 6);
    } else {
      setBorrowedValue(null);
    }
  }

  // Calculate collateral value based on current collateral and prices
  const collateralValue = useMemo(() => {
    if (collaterals && prices) {
      return Object.keys(collaterals).reduce((sum, item) => {
        return sum + prices[item] * collaterals[item];
      }, 0);
    } else {
      return null;
    }
  }, [collaterals, prices]);

  /**
   * Bids
   */

  const updateBids = async () => {
    if (connectedWallet && lcd) {
      // Fetch bids from liquidation contract
      const query = {
        'bids_by_user': {
          'collateral_token': bluna_contract,
          'bidder': connectedWallet.walletAddress,
        }
      }
      const response = await lcd.wasm.contractQuery(liquidation_contract, query)

      // Sort by premium and keep only relevant information
      const bids = response.bids.map((bid) => {
        return {
          idx: parseInt(bid.idx),
          premium_slot: parseInt(bid.premium_slot),
          amount: parseInt(bid.amount) / 10 ** 6,
          liquidated: parseInt(bid.pending_liquidated_collateral) / 10 ** 6,
        }
      }).sort((a, b) => { return a.premium_slot - b.premium_slot});

      setBids(bids);
    } else {
      setBids(null);
    }
  }

  // Aggregate total bid value across all bids
  const totalUSTinBids = useMemo(() => {
    if (bids) {
      return bids.reduce((sum, bid) => {
        return sum + bid.amount
      }, 0);
    } else {
      return 0;
    }
  }, [bids]);


  // Aggregate total liquidated collateral across all bids
  const totalbLUNAinBids = useMemo(() => {
    if (bids) {
      return bids.reduce((sum, bid) => {
        return sum + bid.liquidated
      }, 0);
    } else {
      return 0;
    }
  }, [bids]);

  /**
   * LTV
   */

  // Calculate LTV
  const ltv = useMemo(() => {
    if (borrowedAmount && collateralValue) {
      return borrowedAmount / collateralValue * 100;
    } else {
      return null;
    }
  }, [collateralValue, borrowedAmount]);

  // Emergency LTV = LTV if all bids are canceled and repaid in Anchor
  const emergencyLTV = useMemo(() => {
    if (borrowedAmount && collateralValue) {
      return (borrowedAmount - totalUSTinBids)  / collateralValue * 100;
    } else {
      return null;
    }
  }, [collateralValue, borrowedAmount, totalUSTinBids]);


  /**
   * Main entrypoint
   */

  useEffect(() => {
    // Fetch all data from blockchain
    updatePrices();
    updateCollaterals();
    updateBorrowedValue();
    updateBids();
  }, [connectedWallet, lcd]);

  return (
    <div>
      <h1>Anchor Strategy</h1>
      {!connectedWallet && <p>Wallet not connected!</p>}
      {prices && (
        <>
          <h3>Prices</h3>
          <pre>{JSON.stringify(prices, null, 2)}</pre>
        </>
      )}
      {collaterals && (
        <>
          <h3>Collaterals</h3>
          <pre>{JSON.stringify(collaterals, null, 2)}</pre>
        </>
      )}
      {collateralValue && (
        <>
          <h3>Collateral Value</h3>
          <pre>{collateralValue.toFixed(2)}$</pre>
        </>
      )}
      {borrowedAmount && (
        <>
          <h3>Borrowed Amount</h3>
          <pre>{borrowedAmount.toFixed(2)}$</pre>
        </>
      )}
      {ltv && (
        <>
          <h3>LTV</h3>
          <pre>{ltv.toFixed(2)}%</pre>
        </>
      )}
      {emergencyLTV && (
        <>
          <h3>Emergency LTV (if all bids are repaid)</h3>
          <pre>{emergencyLTV.toFixed(2)}%</pre>
        </>
      )}
      {bids && (
        <>
          <h3>Liquidation Bids</h3>
          {bids.map((bid) => <LiquidationBid bid={bid} />)}
          {totalUSTinBids && (
            <>
              <h4>Total UST in bids</h4>
              {totalUSTinBids.toFixed(2)}$
            </>
          )}
          {totalbLUNAinBids && (
            <>
              <h4>Total liquidated bLUNA</h4>
              {totalbLUNAinBids} bLUNA
            </>
          )}
        </>
      )}
    </div>
  )
}