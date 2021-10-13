import fetch from "node-fetch";
import fs from 'fs';

async function start() {
  const account = '0x9fc13b4e1c4206970a1c4520d2f77336cd5d0e0a';

  let from = 'latest';
  let txList = [];
  let success = true;
  do {
    console.log('fetch from', from);
    const result = await fetch(`https://api.zksync.io/api/v0.2/accounts/${account}/transactions?from=${from}&limit=100&direction=older`);
    const resultJson = await result.json();
    success = resultJson.status === 'success';
    if (success) {
      from = resultJson.result.list[resultJson.result.list.length - 1].txHash;
      txList = [...txList.slice(0, txList.length - 1), ...resultJson.result.list];
      console.log(`${txList.length} from ${resultJson.result.pagination.count}`);
    }
    fs.writeFileSync('result.json', JSON.stringify(txList));
  } while (success);
}

start();
