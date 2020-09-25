import fetch from "node-fetch";


export const getEthPriceInUSD = async () => {
  const resp = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    {
      method: 'get',
      headers: { 'Content-Type': 'application/json' }
    }
  );
  return (await resp.json()).ethereum.usd;
}
