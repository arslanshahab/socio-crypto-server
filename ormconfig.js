const { PG_USER, PG_PASSWORD, PG_HOST, PG_DATABASE, PG_PORT } = process.env;
module.exports = [{
  name: 'default',
  type: 'postgres',
  host: PG_HOST || 'localhost',
  port: Number(PG_PORT) || 5432,
  username: PG_USER || 'postgres',
  password: PG_PASSWORD || 'password',
  database: PG_DATABASE || 'postgres',
  synchronize: false,
  cache: true,
  entities: ['dist/models/**/*.js'],
  migrations: ['dist/migrations/**/*.js'],
  cli: { migrationsDir: 'src/migrations', entitiesDir: 'src/models' },
  uuidExtension: 'pgcrypto',
}];
