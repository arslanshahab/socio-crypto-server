const { NODE_ENV = 'development' } = process.env;

const serverUrls: {[key: string]: string} = {
  'production': 'https://raiinmaker.api.dragonchain.com',
  'staging': 'https://raiinmaker-staging.api.dragonchain.com',
  'development': 'http://localhost:4000'
};

export const serverBaseUrl = serverUrls[NODE_ENV] || serverUrls['development'];
