import fs from 'fs';
import { buildSchema } from 'graphql';

export const getSchema = () => {
  try {
    const rawSchema = fs.readFileSync(__dirname + '/schema.graphql');
    return buildSchema(rawSchema.toString());
  } catch (e) {
    console.error('Error reading schema!', e);
    process.exit(1);
  }
}
