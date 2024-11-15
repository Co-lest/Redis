const { redisMagic, codes } = require('./data.js');

function handleLengthEncoding(data, cursor) {
	const byte = data[cursor];
	const lengthType = (byte & 0b11000000) >> 6;
	const lengthValues = [
		[byte & 0b00111111, cursor + 1],
		[((byte & 0b00111111) << 8) | data[cursor + 1], cursor + 2],
		[data.readUInt32BE(cursor + 1), cursor + 5],
	];
	return (
		lengthValues[lengthType] || new Error(`Invalid length encoding ${lengthType} at ${cursor}`)
	);
}

function getKeysValues(data) {
  const { REDIS_MAGIC_STRING, REDIS_VERSION } = redisMagic;
  let cursor = REDIS_MAGIC_STRING + REDIS_VERSION; // Skip the header

  while (cursor < data.length) {
    if (data[cursor] === codes.SELECTDB) {
      cursor++; // Skip the SELECTDB byte
      continue; // Ignore database selection for this task
    }

    cursor++; // Move to the next byte after a valid opcode

    // Decode key length
    let keyLength;
    [keyLength, cursor] = handleLengthEncoding(data, cursor);

    // Extract key
    const key = data.subarray(cursor, cursor + keyLength).toString();
    console.log("Extracted key:", key, "at cursor:", cursor);
    cursor += keyLength;

    // Decode value length
    let valueLength;
    [valueLength, cursor] = handleLengthEncoding(data, cursor);

    // Extract value
    const value = data.subarray(cursor, cursor + valueLength).toString();
    console.log("Extracted value:", value, "at cursor:", cursor);
    cursor += valueLength;

    // Handle expiration time if present
    if (data[cursor] === codes.EXPIRETIME || data[cursor] === codes.EXPIRETIMEMS) {
      cursor++; // Skip the expiration opcode
      cursor += 4; // Skip expiration timestamp (4 bytes)
    }

    // Return the extracted key-value pair
    return [key, value];
  }

  throw new Error("Reached end of data without finding a key-value pair.");
}


function getFullData(data) {
	const values = [];
	let cursor = 0;
  
	while (cursor < data.length) {
	  const [, value] = getKeysValues(data.slice(cursor));
	  values.push(value);
	  cursor += value.length + 9; // Adjust for overhead bytes
	}
  
	return values;
}

module.exports = {
	getKeysValues,
	getFullData,
};
