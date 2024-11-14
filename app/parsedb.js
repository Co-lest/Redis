const { redisMagic, codes } = require('./data.js');

function handleLengthEncoding(data, cursor) {
  const byte = data[cursor];
  const lengthType = (byte & 0b11000000) >> 6;
  const lengthValues = [
    [byte & 0b00111111, cursor + 1],
    [((byte & 0b00111111) << 8) | data[cursor + 1], cursor + 2],
    [data.readUInt32BE(cursor + 1), cursor + 5],
  ];
  return lengthValues[lengthType] || new Error(`Invalid length encoding ${lengthType} at ${cursor}`);
}

function getKeysValues(data) {
  const { REDIS_MAGIC_STRING, REDIS_VERSION } = redisMagic;
  let cursor = REDIS_MAGIC_STRING + REDIS_VERSION;

  while (cursor < data.length) {
    if (data[cursor] === codes.SELECTDB) {
      break;
    }
    cursor++;
  }

  cursor++;
  let length;
  [length, cursor] = handleLengthEncoding(data, cursor);
  cursor++;
  [length, cursor] = handleLengthEncoding(data, cursor);
  [length, cursor] = handleLengthEncoding(data, cursor);

  if (data[cursor] === codes.EXPIRETIME) {
    cursor++;
    cursor += 4;
  }

  cursor++;
  const redisKeyLength = data[cursor];
  const redisK = data.subarray(cursor + 1, cursor + 1 + redisKeyLength).toString();

  cursor = cursor + 1 + redisKeyLength;
  const redisValueLength = data[cursor];
  const redisV = data.subarray(cursor + 1, cursor + 1 + redisValueLength).toString();
  return [redisK, redisV];
}

function getFullData(data) {
  if (!data || data.length === 0) {
    return [];
  }

  const values = [];
  let cursor = 0;
  
  try {
    while (cursor < data.length) {
      const [key, value] = getKeysValues(data.slice(cursor));
      if (key && value) {
        values.push(value);
      }
      // Move cursor to next record, accounting for key and value lengths plus headers
      cursor += key.length + value.length + 10; // Include magic bytes and other overhead
    }
  } catch (error) {
    console.error('Error parsing data:', error);
  }

  return values;
}

module.exports = {
  getKeysValues,
  getFullData,
};