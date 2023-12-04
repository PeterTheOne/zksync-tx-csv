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
      if (resultJson.result.list.length === 1) {
        success = false;
      }
    }
  } while (success);

  // Convert to CSV
  const csv = jsonToCSV(txList);
  fs.writeFileSync('result.csv', csv);
}

function flattenObject(obj, parentPrefix = '') {
  let flattened = {};

  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const flatChild = flattenObject(obj[key], `${parentPrefix}${key}.`);
      Object.assign(flattened, flatChild);
    } else {
      flattened[`${parentPrefix}${key}`] = obj[key];
    }
  }

  return flattened;
}

function jsonToCSV(jsonArray) {
  if (jsonArray.length === 0) {
    return '';
  }

  // Flatten each object in the array
  const flattenedArray = jsonArray.map(item => flattenObject(item));

  // Extract headers
  const headers = Object.keys(flattenedArray[0]);
  const csvRows = flattenedArray.map(row => 
    headers.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')
  );

  return [headers.join(','), ...csvRows].join('\r\n');

  function replacer(key, value) {
    if (value == null) return '';
    return value;
  }
}

start();
