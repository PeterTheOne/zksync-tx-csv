import fetch from "node-fetch";
import fs from 'fs';

const TOKEN_LIMIT = 100;
const TX_LIMIT = 100;
const API_BASE_URL = 'https://api.zksync.io/api/v0.2';

// todo: move to dotenv or console args
const account = '0x9fc13b4e1c4206970a1c4520d2f77336cd5d0e0a';

async function fetchTokens() {
  let tokens = {};
  let from = 'latest';
  let tokenCount = 0;
  let seenTokenIds = new Set(); // Set to track seen tokens

  while (true) {
    console.log(`Fetching tokens starting from ID: ${from}`);
    const response = await fetch(`${API_BASE_URL}/tokens?from=${from}&limit=${TOKEN_LIMIT}&direction=older`);
    const { status, result } = await response.json();
    if (status !== 'success' || result.list.length === 0) {
      break;
    }
    result.list.forEach(token => {
      if (!seenTokenIds.has(token.id)) {
        tokens[token.id] = token;
        tokenCount++;
        seenTokenIds.add(token.id);
      }
    });
    console.log(`Fetched ${tokenCount} tokens so far`);
    
    if (result.list.length < TOKEN_LIMIT) {
      break;
    }

    from = result.list[result.list.length - 1].id;
  }
  console.log(`Finished fetching tokens. Total tokens fetched: ${tokenCount}`);
  return tokens;
}

async function fetchTransactions(account, tokens) {
  let from = 'latest';
  let txList = [];
  let transactionCount = 0;
  let seenTxHashes = new Set(); // Set to track seen transactions

  while (true) {
    console.log(`Fetching transactions starting from hash: ${from}`);
    const response = await fetch(`${API_BASE_URL}/accounts/${account}/transactions?from=${from}&limit=${TX_LIMIT}&direction=older`);
    const { status, result } = await response.json();
    if (status !== 'success' || result.list.length === 0) {
      break;
    }
    result.list.forEach(tx => {
      if (!seenTxHashes.has(tx.txHash)) {
        if (tx.op && tokens[tx.op.token]) {
          tx.op.tokenDetails = tokens[tx.op.token];
        }
        txList.push(tx);
        transactionCount++;
        seenTxHashes.add(tx.txHash);
      }
    });
    console.log(`Fetched ${transactionCount} transactions so far`);

    if (result.list.length < TX_LIMIT) {
      break;
    }

    from = result.list[result.list.length - 1].txHash;
  }
  console.log(`Finished fetching transactions. Total transactions fetched: ${transactionCount}`);
  return txList;
}

async function start() {
  const tokens = await fetchTokens();
  const txList = await fetchTransactions(account, tokens);

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
