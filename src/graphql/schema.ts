import fs from 'fs';
import { buildSchema } from 'graphql';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);

export const getSchema = async () => {
  try {
    const rawSchema = await readFile(__dirname + '/schema.graphql');
    return buildSchema(rawSchema.toString());
  } catch (e) {
    console.error('Error reading schema!', e);
    process.exit(1);
  }
}
